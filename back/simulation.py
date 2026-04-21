"""
Simulation manager for the cybersecurity dashboard game.
Orchestrates the simulation lifecycle and user fix actions.
Imports core logic from simulation_core.py.
"""
import asyncio
from datetime import datetime, timezone
from database import SessionLocal, security_logs_collection
import models
from attack_definitions import STANDARD_REBOOT_SECONDS
from simulation_core import SimulationCore


class SimulationManager(SimulationCore):
    """Orchestrates simulation lifecycle and user fix actions."""

    def __init__(self):
        self.is_running: bool = False
        self.start_time: float = 0
        self.current_phase: str = "normal"
        self.financial_exposure: float = 0.0
        self.active_attacks: dict = {}
        self.attack_history: dict = {}
        self.blocked_ips: set = set()
        self._task: asyncio.Task | None = None
        self._next_attack_delay: float = 0
        self._stealth_last_tick: float = 0

    # ------------------------------------------------------------------
    # Public lifecycle
    # ------------------------------------------------------------------
    async def start(self):
        """Reset state and kick off the background simulation task."""
        self.stop()
        self.is_running = True
        self.start_time = asyncio.get_event_loop().time()
        self.current_phase = "normal"
        self.financial_exposure = 0.0
        self.active_attacks = {}
        self.attack_history = {}
        self.blocked_ips = set()
        self._next_attack_delay = self._random_delay()
        self._stealth_last_tick = self.start_time

        db = SessionLocal()
        try:
            db.query(models.Equipment).update({"status": "Online"})
            db.query(models.RiskAssessment).update({"is_resolved": True})
            db.commit()
        finally:
            db.close()

        self._task = asyncio.create_task(self._game_loop())

    def stop(self):
        """Cancel the background task."""
        self.is_running = False
        if self._task:
            self._task.cancel()
            self._task = None

    # ------------------------------------------------------------------
    # User action: apply fix
    # ------------------------------------------------------------------
    async def apply_fix(self, equipment_id: int):
        """Resolve an active attack on the given equipment."""
        db = SessionLocal()
        try:
            attack_data = self.active_attacks.get(equipment_id)
            if not attack_data:
                return {"status": "no_active_attack"}

            attack_type = attack_data["type"]
            eq = db.query(models.Equipment).filter(models.Equipment.id == equipment_id).first()
            if not eq:
                return {"status": "equipment_not_found"}

            self.blocked_ips.add(attack_data["source_ip"])

            if attack_type == "Ransomware" and eq.status == "Encrypted":
                eq.status = "Rebooting"
                db.commit()
                await asyncio.sleep(30)
                eq = db.query(models.Equipment).filter(models.Equipment.id == equipment_id).first()
                if eq:
                    eq.status = "Online"
                    db.commit()
            elif attack_type == "DDoS" and eq.status == "Offline":
                eq.status = "Rebooting"
                db.commit()
                await asyncio.sleep(STANDARD_REBOOT_SECONDS)
                eq = db.query(models.Equipment).filter(models.Equipment.id == equipment_id).first()
                if eq:
                    eq.status = "Online"
                    db.commit()
            else:
                eq.status = "Rebooting"
                db.commit()
                await asyncio.sleep(STANDARD_REBOOT_SECONDS)
                eq = db.query(models.Equipment).filter(models.Equipment.id == equipment_id).first()
                if eq:
                    eq.status = "Online"
                    db.commit()

            risk = db.query(models.RiskAssessment).filter(
                models.RiskAssessment.id == attack_data["risk_id"]
            ).first()
            if risk:
                risk.is_resolved = True
                db.commit()

            if equipment_id in self.active_attacks:
                del self.active_attacks[equipment_id]

            await self._update_topology_dependencies(db)

            await security_logs_collection.insert_one({
                "event_type": "Auto-Fix Applied",
                "description": f"Attack resolved on {eq.name} (IP: {attack_data['source_ip']}).",
                "source_ip": attack_data["source_ip"],
                "timestamp": datetime.now(timezone.utc),
            })

            return {"status": "success", "attack_type": attack_type}
        finally:
            db.close()

    # ------------------------------------------------------------------
    # Status queries (for frontend)
    # ------------------------------------------------------------------
    def get_status(self) -> dict:
        """Return current simulation state."""
        return {
            "is_running": self.is_running,
            "phase": self.current_phase,
            "financial_exposure": self.financial_exposure,
            "active_attacks_count": len(self.active_attacks),
        }