"""
Topology and financial helpers for the cybersecurity dashboard game.
Imported by simulation_core.py to keep files under 250 lines.
"""
import asyncio
import random
from database import SessionLocal, security_logs_collection
import models
from attack_definitions import SIMULATION_ATTACKS, STANDARD_REBOOT_SECONDS


class SimulationTopology:
    """Topology dependencies and financial impact helpers."""

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
    async def _update_topology_dependencies(self, db):
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
            return random.uniform(
                __import__("attack_definitions", fromlist=["ESCALATED_ATTACK_DELAY_MIN"]).ESCALATED_ATTACK_DELAY_MIN,
                __import__("attack_definitions", fromlist=["ESCALATED_ATTACK_DELAY_MAX"]).ESCALATED_ATTACK_DELAY_MAX,
            )
        return random.uniform(
            __import__("attack_definitions", fromlist=["NORMAL_ATTACK_DELAY_MIN"]).NORMAL_ATTACK_DELAY_MIN,
            __import__("attack_definitions", fromlist=["NORMAL_ATTACK_DELAY_MAX"]).NORMAL_ATTACK_DELAY_MAX,
        )

    def _pick_attack_type(self) -> str:
        """Pick attack type with diminishing returns."""
        _ADW = __import__("attack_definitions", fromlist=["DEFAULT_ATTACK_WEIGHTS"]).DEFAULT_ATTACK_WEIGHTS
        weights = dict(_ADW)
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