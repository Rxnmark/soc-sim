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
        """Resolve an active attack on the given equipment (non-blocking)."""
        db = SessionLocal()
        try:
            attack_data = self.active_attacks.get(equipment_id)
            eq = db.query(models.Equipment).filter(models.Equipment.id == equipment_id).first()
            if not eq:
                return {"status": "equipment_not_found"}

            attack_type = None
            recovery_time = STANDARD_REBOOT_SECONDS

            # If no simulation attack, fall back to legacy reboot
            if not attack_data:
                attack_type = "legacy"
            else:
                attack_type = attack_data["type"]
                self.blocked_ips.add(attack_data["source_ip"])
                if attack_type == "Ransomware" and eq.status == "Encrypted":
                    recovery_time = 30

            # Set to Rebooting immediately
            eq.status = "Rebooting"
            db.commit()

            # Resolve risks immediately
            if attack_data:
                risk = db.query(models.RiskAssessment).filter(
                    models.RiskAssessment.id == attack_data["risk_id"]
                ).first()
                if risk:
                    risk.is_resolved = True
                if equipment_id in self.active_attacks:
                    del self.active_attacks[equipment_id]
                db.commit()
            else:
                db.query(models.RiskAssessment).filter(
                    models.RiskAssessment.equipment_id == equipment_id
                ).update({"is_resolved": True})
                db.commit()

            # Start background recovery task (non-blocking)
            asyncio.create_task(self._recovery_equipment(equipment_id, eq.name, attack_type, recovery_time))

            return {"status": "success", "attack_type": attack_type}
        finally:
            db.close()

    async def _recovery_equipment(self, equipment_id: int, eq_name: str, attack_type: str, recovery_seconds: float):
        """Background task: wait for recovery time, then set equipment back to Online."""
        await asyncio.sleep(recovery_seconds)

        db = SessionLocal()
        try:
            eq = db.query(models.Equipment).filter(models.Equipment.id == equipment_id).first()
            if eq and eq.status == "Rebooting":
                eq.status = "Online"
                db.commit()

            await security_logs_collection.insert_one({
                "event_type": "Auto-Fix Applied",
                "description": f"Equipment {eq_name} recovered after {attack_type} fix ({recovery_seconds}s).",
                "source_ip": eq.ip_address if eq else "unknown",
                "timestamp": datetime.now(timezone.utc),
            })

            # Recalculate topology dependencies to restore children
            await self._update_topology_dependencies(db)
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