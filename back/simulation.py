"""
Simulation engine for the cybersecurity dashboard game.
Manages the live attack simulation loop, attack spawning,
financial exposure tracking, and user fix actions.
"""
import asyncio
import random
from datetime import datetime, timezone
from database import SessionLocal, security_logs_collection
import models
from sqlalchemy.orm import Session
from attack_definitions import (
    SIMULATION_ATTACKS,
    CRITICAL_GATEWAY_IDS,
    DEFAULT_ATTACK_WEIGHTS,
    ESCALATION_PHASE_SECONDS,
    STEALTH_FINANCIAL_INTERVAL,
    NORMAL_ATTACK_DELAY_MIN,
    NORMAL_ATTACK_DELAY_MAX,
    ESCALATED_ATTACK_DELAY_MIN,
    ESCALATED_ATTACK_DELAY_MAX,
    STANDARD_REBOOT_SECONDS,
    GAME_OVER_CHECK_INTERVAL,
)


class SimulationManager:
    """Manages the live attack simulation game loop."""

    def __init__(self):
        self.is_running: bool = False
        self.start_time: float = 0  # asyncio time
        self.current_phase: str = "normal"  # normal | escalated
        self.financial_exposure: float = 0.0
        self.active_attacks: dict = {}  # {equipment_id: attack_data}
        self.attack_history: dict = {}  # {attack_type: count}
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

        # Reset all equipment to Online via DB session
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
    # Core game loop
    # ------------------------------------------------------------------
    async def _game_loop(self):
        loop_start = asyncio.get_event_loop().time()

        while self.is_running:
            now = asyncio.get_event_loop().time()
            elapsed = now - self.start_time

            # --- Phase escalation after ESCALATION_PHASE_SECONDS ---
            if elapsed >= ESCALATION_PHASE_SECONDS and self.current_phase != "escalated":
                self.current_phase = "escalated"

            # --- Stealth financial exposure: +$50k every STEALTH_FINANCIAL_INTERVAL s ---
            if now - self._stealth_last_tick >= STEALTH_FINANCIAL_INTERVAL:
                await self._apply_stealth_financial_impact()
                self._stealth_last_tick = now

            # --- Check game-over: if ALL equipment offline/encrypted/unreachable ---
            if await self._all_equipment_down():
                await asyncio.sleep(GAME_OVER_CHECK_INTERVAL)
                continue

            # --- Attack timer ---
            if now - loop_start >= self._next_attack_delay:
                await self._spawn_attack()
                loop_start = now
                self._next_attack_delay = self._random_delay()

            await asyncio.sleep(1)

    # ------------------------------------------------------------------
    # Attack spawning
    # ------------------------------------------------------------------
    async def _spawn_attack(self):
        db = SessionLocal()
        try:
            all_eq = db.query(models.Equipment).all()
            available_ids = {
                eq.id for eq in all_eq
                if eq.status in ("Online", "Rebooting") and eq.id not in self.active_attacks
            }
            if not available_ids:
                return

            target_id = random.choice(list(available_ids))
            target = db.query(models.Equipment).filter(models.Equipment.id == target_id).first()
            if not target:
                return

            attack_type = self._pick_attack_type()
            source_ip = self._generate_unique_ip()

            log_event = random.choice(SIMULATION_ATTACKS[attack_type]["log_events"])
            description = log_event.format(target_name=target.name, attack_type=attack_type)
            timestamp = datetime.now(timezone.utc)

            # Apply attack effect
            self._apply_attack_effect(target, attack_type, db)

            # Create RiskAssessment
            new_risk = models.RiskAssessment(
                equipment_id=target_id,
                risk_level=target.risk_level,
                description=f"[SIM] {attack_type}: {description}",
                is_resolved=False,
                attack_type=attack_type,
                financial_impact=0,
                created_at=timestamp,
            )
            db.add(new_risk)
            db.commit()

            # Insert log into MongoDB
            await security_logs_collection.insert_one({
                "event_type": f"[SIM] {attack_type}",
                "description": description,
                "source_ip": source_ip,
                "timestamp": timestamp,
            })

            # Track active attack
            self.active_attacks[target_id] = {
                "type": attack_type,
                "source_ip": source_ip,
                "risk_id": new_risk.id,
                "financial_impact_total": 0,
                "applied_at": asyncio.get_event_loop().time(),
            }

            self.attack_history[attack_type] = self.attack_history.get(attack_type, 0) + 1
            await self._update_topology_dependencies(db)

        finally:
            db.close()

    def _apply_attack_effect(self, target, attack_type: str, db: Session):
        """Apply the effect of an attack on the target equipment."""
        if attack_type == "DDoS":
            target.status = "Offline"
            target.risk_level = "Critical"
        elif attack_type == "Stealth":
            target.risk_level = "Medium"
        elif attack_type == "Ransomware":
            target.risk_level = "Critical"
            asyncio.create_task(self._schedule_ransomware_encryption(target.id, db))
        else:
            target.risk_level = "Medium"

    async def _schedule_ransomware_encryption(self, equipment_id: int, db: Session):
        """Schedule a ransomware encryption after the timeout period."""
        ransomware_config = SIMULATION_ATTACKS["Ransomware"]
        await asyncio.sleep(ransomware_config["ransomware_timeout_seconds"])

        if not self.is_running or equipment_id not in self.active_attacks:
            return

        attack_data = self.active_attacks.get(equipment_id)
        if not attack_data or attack_data["type"] != "Ransomware":
            return

        try:
            eq = db.query(models.Equipment).filter(models.Equipment.id == equipment_id).first()
            if eq:
                eq.status = "Encrypted"
                db.commit()

                risk = db.query(models.RiskAssessment).filter(
                    models.RiskAssessment.id == attack_data["risk_id"]
                ).first()
                if risk:
                    risk.description = f"[SIM] Ransomware: ENCRYPTED - {risk.description}"
                db.commit()

                # Schedule recovery (encrypted_recovery_seconds for encrypted)
                await asyncio.sleep(ransomware_config["encrypted_recovery_seconds"])

                if self.is_running:
                    eq = db.query(models.Equipment).filter(models.Equipment.id == equipment_id).first()
                    if eq and eq.status == "Encrypted":
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
        finally:
            db.close()

    # ------------------------------------------------------------------
    # Stealth financial impact
    # ------------------------------------------------------------------
    async def _apply_stealth_financial_impact(self):
        """Add financial exposure for each active stealth attack."""
        for eq_id, attack_data in self.active_attacks.items():
            if attack_data["type"] == "Stealth":
                impact = SIMULATION_ATTACKS["Stealth"]["financial_impact_per_tick"]
                self.financial_exposure += impact
                attack_data["financial_impact_total"] += impact

                db = SessionLocal()
                try:
                    risk = db.query(models.RiskAssessment).filter(
                        models.RiskAssessment.id == attack_data["risk_id"]
                    ).first()
                    if risk:
                        risk.financial_impact = attack_data["financial_impact_total"]
                        db.commit()
                finally:
                    db.close()

    # ------------------------------------------------------------------
    # Topology dependencies
    # ------------------------------------------------------------------
    async def _update_topology_dependencies(self, db: Session):
        """If critical gateways go offline, mark IoT/Endpoint as Unreachable."""
        gateway_offline = False
        for gid in CRITICAL_GATEWAY_IDS:
            eq = db.query(models.Equipment).filter(models.Equipment.id == gid).first()
            if eq and eq.status in ("Offline", "Encrypted"):
                gateway_offline = True
                break

        if gateway_offline:
            for eq in db.query(models.Equipment).all():
                if eq.type in ("IoT", "Endpoint") and eq.status == "Online":
                    if eq.id not in self.active_attacks:
                        eq.status = "Unreachable"
            db.commit()
        else:
            for eq in db.query(models.Equipment).all():
                if eq.type in ("IoT", "Endpoint") and eq.status == "Unreachable":
                    if eq.id not in self.active_attacks:
                        eq.status = "Online"
            db.commit()

    # ------------------------------------------------------------------
    # Helpers
    # ------------------------------------------------------------------
    def _random_delay(self) -> float:
        if self.current_phase == "escalated":
            return random.uniform(ESCALATED_ATTACK_DELAY_MIN, ESCALATED_ATTACK_DELAY_MAX)
        return random.uniform(NORMAL_ATTACK_DELAY_MIN, NORMAL_ATTACK_DELAY_MAX)

    def _pick_attack_type(self) -> str:
        """Pick attack type with diminishing returns."""
        weights = dict(DEFAULT_ATTACK_WEIGHTS)
        for atype, count in self.attack_history.items():
            weights[atype] = max(1, weights.get(atype, 2) - count * 0.3)

        types = list(weights.keys())
        w = [weights[t] for t in types]
        return random.choices(types, weights=w)[0]

    def _generate_unique_ip(self) -> str:
        """Generate a random source IP that hasn't been blocked."""
        while True:
            ip = f"{random.randint(1, 223)}.{random.randint(0, 255)}.{random.randint(0, 255)}.{random.randint(1, 254)}"
            if ip not in self.blocked_ips:
                return ip

    async def _all_equipment_down(self) -> bool:
        """Check if all equipment is non-functional."""
        db = SessionLocal()
        try:
            all_eq = db.query(models.Equipment).all()
            if not all_eq:
                return True
            for eq in all_eq:
                if eq.status in ("Online", "Rebooting"):
                    return False
            return True
        finally:
            db.close()

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