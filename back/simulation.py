import asyncio
import random
from datetime import datetime, timezone, timedelta
from database import SessionLocal, security_logs_collection
import models
from sqlalchemy.orm import Session


# Attack definitions for the simulation engine
SIMULATION_ATTACKS = {
    "DDoS": {
        "types": ["DDoS Attack", "Traffic Flood", "SYN Flood"],
        "log_events": [
            "Massive incoming traffic flood detected targeting {target_name}.",
            "DDoS attack detected: {attack_type} from multiple sources.",
            "Service degradation due to traffic overload on {target_name}.",
        ],
        "effect": "offline",
    },
    "Stealth": {
        "types": ["Data Leak", "Spyware", "Covert Channel", "Data Exfiltration"],
        "log_events": [
            "Suspicious data transfer detected from {target_name}.",
            "Covert data exfiltration attempt identified on {target_name}.",
            "Hidden malware communication channel detected on {target_name}.",
        ],
        "effect": "stealth",
        "financial_impact_per_tick": 50000,
    },
    "Ransomware": {
        "types": ["Ransomware", "CryptoLocker", "RansomWare-X", "Encryption Attack"],
        "log_events": [
            "Ransomware encryption activity detected on {target_name}.",
            "Unauthorized file encryption attempt on {target_name}.",
            "Ransomware payload execution detected on {target_name}.",
        ],
        "effect": "ransomware",
        "ransomware_timeout_seconds": 15,
        "encrypted_recovery_seconds": 30,
    },
}

# Equipment that counts as "critical infrastructure" — if all go offline, everything becomes unreachable
CRITICAL_GATEWAY_IDS = {1}


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

            # --- Phase escalation after 180 s (3 min) ---
            if elapsed >= 180 and self.current_phase != "escalated":
                self.current_phase = "escalated"

            # --- Stealth financial exposure: +$50k every 5 s while stealth attacks active ---
            if now - self._stealth_last_tick >= 5:
                await self._apply_stealth_financial_impact()
                self._stealth_last_tick = now

            # --- Check game-over: if ALL equipment offline / encrypted / unreachable → pause ---
            if await self._all_equipment_down():
                await asyncio.sleep(2)
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
            # Get all online equipment that doesn't already have an active attack
            all_eq = db.query(models.Equipment).all()
            available_ids = {
                eq.id for eq in all_eq
                if eq.status in ("Online", "Rebooting") and eq.id not in self.active_attacks
            }
            if not available_ids:
                return

            # Pick a random target
            target_id = random.choice(list(available_ids))
            target = db.query(models.Equipment).filter(models.Equipment.id == target_id).first()
            if not target:
                return

            # Choose attack type (weighted)
            attack_type = self._pick_attack_type()

            # Generate a unique source IP (rotates if previously blocked)
            source_ip = self._generate_unique_ip()

            # Build log message
            log_event = random.choice(SIMULATION_ATTACKS[attack_type]["log_events"])
            description = log_event.format(target_name=target.name, attack_type=attack_type)

            timestamp = datetime.now(timezone.utc)

            # ---- Apply attack effect ----
            if attack_type == "DDoS":
                target.status = "Offline"
                risk_level = "Critical"
            elif attack_type == "Stealth":
                risk_level = "Medium"
            elif attack_type == "Ransomware":
                risk_level = "Critical"
                # Schedule encryption timeout
                await self._schedule_ransomware_encryption(target_id, db)
            else:
                risk_level = "Medium"

            # Create RiskAssessment
            new_risk = models.RiskAssessment(
                equipment_id=target_id,
                risk_level=risk_level,
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
                "applied_at": now if hasattr(self, '_last_loop_time') else 0,
            }

            # Track attack history for diminishing returns
            self.attack_history[attack_type] = self.attack_history.get(attack_type, 0) + 1

            # Update topology dependencies
            await self._update_topology_dependencies(db)

        finally:
            db.close()

    async def _schedule_ransomware_encryption(self, equipment_id: int, db: Session):
        """Schedule a ransomware encryption after the timeout period."""
        timeout = SIMULATION_ATTACKS["Ransomware"]["ransomware_timeout_seconds"]
        await asyncio.sleep(timeout)

        if not self.is_running or equipment_id not in self.active_attacks:
            return

        # Check if the attack was resolved in the meantime
        attack_data = self.active_attacks.get(equipment_id)
        if not attack_data or attack_data["type"] != "Ransomware":
            return

        # Apply encryption
        try:
            eq = db.query(models.Equipment).filter(models.Equipment.id == equipment_id).first()
            if eq:
                eq.status = "Encrypted"
                db.commit()

                # Update the risk to reflect encryption
                risk = db.query(models.RiskAssessment).filter(
                    models.RiskAssessment.id == attack_data["risk_id"]
                ).first()
                if risk:
                    risk.description = f"[SIM] Ransomware: ENCRYPTED - {risk.description}"

                db.commit()

                # Schedule recovery (30 seconds for encrypted)
                recovery_time = SIMULATION_ATTACKS["Ransomware"]["encrypted_recovery_seconds"]
                await asyncio.sleep(recovery_time)

                # Auto-recover encrypted equipment
                if self.is_running:
                    eq = db.query(models.Equipment).filter(models.Equipment.id == equipment_id).first()
                    if eq and eq.status == "Encrypted":
                        eq.status = "Online"
                        db.commit()

                        # Remove the risk
                        risk = db.query(models.RiskAssessment).filter(
                            models.RiskAssessment.id == attack_data["risk_id"]
                        ).first()
                        if risk:
                            risk.is_resolved = True
                            db.commit()

                        # Remove from active attacks
                        if equipment_id in self.active_attacks:
                            del self.active_attacks[equipment_id]

                        # Update topology
                        await self._update_topology_dependencies(db)
        finally:
            db.close()

    # ------------------------------------------------------------------
    # Stealth financial impact
    # ------------------------------------------------------------------
    async def _apply_stealth_financial_impact(self):
        """Add $50k financial exposure for each active stealth attack."""
        for eq_id, attack_data in self.active_attacks.items():
            if attack_data["type"] == "Stealth":
                impact = SIMULATION_ATTACKS["Stealth"]["financial_impact_per_tick"]
                self.financial_exposure += impact
                attack_data["financial_impact_total"] += impact

                # Update risk financial_impact
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
            # Mark IoT and Endpoint as Unreachable (if not already in a worse state)
            for eq in db.query(models.Equipment).all():
                if eq.type in ("IoT", "Endpoint") and eq.status == "Online":
                    if eq.id not in self.active_attacks:
                        eq.status = "Unreachable"
            db.commit()
        else:
            # Restore devices that are Unreachable only because of the gateway
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
            return random.uniform(10, 20)
        return random.uniform(20, 40)

    def _pick_attack_type(self) -> str:
        """Pick attack type with diminishing returns."""
        weights = {"DDoS": 3, "Stealth": 4, "Ransomware": 2}
        for atype, count in self.attack_history.items():
            # Reduce weight for frequently attacked types
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

            # Block the source IP
            self.blocked_ips.add(attack_data["source_ip"])

            if attack_type == "Ransomware" and eq.status == "Encrypted":
                # Encrypted equipment needs 30s recovery
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
                await asyncio.sleep(5)
                eq = db.query(models.Equipment).filter(models.Equipment.id == equipment_id).first()
                if eq:
                    eq.status = "Online"
                    db.commit()
            else:
                # Standard fix: 5s reboot
                eq.status = "Rebooting"
                db.commit()
                await asyncio.sleep(5)
                eq = db.query(models.Equipment).filter(models.Equipment.id == equipment_id).first()
                if eq:
                    eq.status = "Online"
                    db.commit()

            # Mark risk as resolved
            risk = db.query(models.RiskAssessment).filter(
                models.RiskAssessment.id == attack_data["risk_id"]
            ).first()
            if risk:
                risk.is_resolved = True
                db.commit()

            # Remove from active attacks
            if equipment_id in self.active_attacks:
                del self.active_attacks[equipment_id]

            # Update topology
            await self._update_topology_dependencies(db)

            # Log the fix
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