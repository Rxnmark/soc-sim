"""
Core simulation logic for the cybersecurity dashboard game.
Contains game loop, attack spawning, financial impact, and topology management.
Imported by simulation.py to keep files under 250 lines.
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


class SimulationCore:
    """Core simulation logic - game loop, attacks, and state management."""

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
                if eq.status in ("Online", "Rebooting", "Unreachable") and eq.id not in self.active_attacks
            }
            if not available_ids:
                return

            target_id = random.choice(list(available_ids))
            target = db.query(models.Equipment).filter(models.Equipment.id == target_id).first()
            if not target:
                return

            attack_category = self._pick_attack_type()
            source_ip = self._generate_unique_ip()

            # Pick a random subtype from the category (e.g., "CryptoLocker" from "Ransomware")
            attack_subtype = random.choice(SIMULATION_ATTACKS[attack_category]["types"])
            
            # Pick a random log event template
            log_event = random.choice(SIMULATION_ATTACKS[attack_category]["log_events"])
            description = log_event.format(target_name=target.name, attack_type=attack_subtype)
            timestamp = datetime.now(timezone.utc)

            self._apply_attack_effect(target, attack_category, db)

            new_risk = models.RiskAssessment(
                equipment_id=target_id,
                risk_level=target.risk_level,
                description=f"{attack_subtype} detected on {target.name}: {description}",
                is_resolved=False,
                attack_type=attack_category,
                financial_impact=0,
                created_at=timestamp,
            )
            db.add(new_risk)
            db.commit()

            await security_logs_collection.insert_one({
                "event_type": attack_subtype,
                "description": description,
                "source_ip": source_ip,
                "target_ip": target.ip_address,
                "timestamp": timestamp,
            })

            self.active_attacks[target_id] = {
                "type": attack_category,
                "source_ip": source_ip,
                "risk_id": new_risk.id,
                "financial_impact_total": 0,
                "applied_at": asyncio.get_event_loop().time(),
            }

            self.attack_history[attack_category] = self.attack_history.get(attack_category, 0) + 1
            await self._update_topology_dependencies(db)

        finally:
            db.close()

    def _apply_attack_effect(self, target, attack_category: str, db: Session):
        """Apply the effect of an attack on the target equipment."""
        if attack_category == "DDoS":
            target.status = "Offline"
            target.risk_level = "Critical"
        elif attack_category == "Stealth":
            target.risk_level = "Medium"
        elif attack_category == "Ransomware":
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
                    risk.description = f"CRITICAL: {risk.description} - Files encrypted"
                db.commit()

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
        """Cascading offline status based on explicit network topology."""
        # Explicit connections: [child_id, parent_id]
        # Same topology as frontend for consistent behavior
        explicit_connections = [
            # Core network backbone
            (2, 1),   # Core Switch Alpha → Main Gateway Router
            # Enterprise network (via Core Switch)
            (3, 2), (6, 2), (7, 2), (18, 2), (19, 2),
            # Database tier
            (4, 6), (5, 7),
            # Endpoints
            (16, 2), (17, 2),
            # IoT network (via Guest WiFi Gateway)
            (13, 20), (14, 20), (15, 20),
            # ICS/OT network
            (8, 1), (9, 8), (10, 8), (11, 8), (12, 8),
        ]

        # Build adjacency list
        adj = {}
        parent_map = {}
        for child_id, parent_id in explicit_connections:
            parent = db.query(models.Equipment).filter(models.Equipment.id == parent_id).first()
            child = db.query(models.Equipment).filter(models.Equipment.id == child_id).first()
            if not parent or not child:
                continue

            if parent_id not in adj:
                adj[parent_id] = []
            adj[parent_id].append(child_id)
            parent_map[child_id] = parent_id

        # Calculate cascading offline status
        affected_status = {}

        def propagate_offline(node_id: int, is_parent_offline: bool):
            eq = db.query(models.Equipment).filter(models.Equipment.id == node_id).first()
            if not eq:
                return

            currently_offline = eq.status in ("Offline", "Encrypted") or is_parent_offline
            affected_status[node_id] = currently_offline

            # Propagate to children
            for child_id in adj.get(node_id, []):
                propagate_offline(child_id, currently_offline)

        # Find root nodes (no parents)
        all_ids = {eq.id for eq in db.query(models.Equipment).all()}
        roots = [rid for rid in all_ids if rid not in parent_map]

        for root_id in roots:
            propagate_offline(root_id, False)

        # Update Unreachable status for IoT/Endpoint devices
        for eq in db.query(models.Equipment).all():
            if eq.type in ("IoT", "Endpoint") and eq.id not in self.active_attacks:
                is_parent_offline = affected_status.get(eq.id, False)
                if is_parent_offline and eq.status in ("Online", "Unreachable"):
                    eq.status = "Unreachable"
                elif not is_parent_offline and eq.status in ("Unreachable", "Offline", "Rebooting"):
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