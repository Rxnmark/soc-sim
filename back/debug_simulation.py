"""
Debug endpoints for the cybersecurity dashboard simulation.
Provides detailed visibility into simulation state for diagnosing attack issues.
Imported by main.py to keep files under 250 lines.
"""
from fastapi import APIRouter
from simulation_endpoints import simulation_manager
from schemas import SimulationStatus

router = APIRouter()


@router.get("/api/v1/debug/simulation/state")
def _debug_simulation_state():
    """Returns full internal state of the simulation manager for debugging."""
    return {
        "is_running": simulation_manager.is_running,
        "phase": simulation_manager.current_phase,
        "financial_exposure": simulation_manager.financial_exposure,
        "active_attacks": {
            str(k): {
                "type": v["type"],
                "source_ip": v["source_ip"],
                "risk_id": str(v["risk_id"]),
                "financial_impact_total": v["financial_impact_total"],
                "applied_at": v["applied_at"],
            }
            for k, v in simulation_manager.active_attacks.items()
        },
        "attack_history": simulation_manager.attack_history,
        "blocked_ips_count": len(simulation_manager.blocked_ips),
        "active_attacks_count": len(simulation_manager.active_attacks),
    }


@router.get("/api/v1/debug/simulation/available")
def _debug_available_equipment():
    """Returns all equipment with their statuses and whether they can be attacked."""
    from database import SessionLocal
    import models

    db = SessionLocal()
    try:
        all_eq = db.query(models.Equipment).all()
        available = []
        for eq in all_eq:
            can_attack = eq.status in ("Online", "Rebooting", "Unreachable", "Offline")
            in_active = eq.id in simulation_manager.active_attacks
            available.append({
                "id": eq.id,
                "name": eq.name,
                "type": eq.type,
                "ip_address": eq.ip_address,
                "status": eq.status,
                "can_be_attacked": can_attack,
                "in_active_attacks": in_active,
                "will_be_attacked": can_attack and not in_active,
            })
        return {
            "total_equipment": len(all_eq),
            "available_for_attack": sum(1 for e in available if e["will_be_attacked"]),
            "equipment": available,
        }
    finally:
        db.close()


@router.get("/api/v1/debug/simulation/topology")
def _debug_topology():
    """Returns the current topology state with cascading analysis."""
    from database import SessionLocal
    import models

    db = SessionLocal()
    try:
        all_eq = db.query(models.Equipment).all()
        eq_map = {eq.id: eq for eq in all_eq}

        explicit_connections = [
            (2, 1), (3, 2), (6, 2), (7, 2), (18, 2), (19, 2),
            (4, 6), (5, 7), (16, 2), (17, 2),
            (13, 20), (14, 20), (15, 20),
            (8, 1), (9, 8), (10, 8), (11, 8), (12, 8),
        ]

        adj = {}
        parent_map = {}
        for child_id, parent_id in explicit_connections:
            if parent_id not in adj:
                adj[parent_id] = []
            adj[parent_id].append(child_id)
            parent_map[child_id] = parent_id

        affected_status = {}

        def propagate_offline(node_id: int, is_parent_offline: bool):
            eq = eq_map.get(node_id)
            if not eq:
                return
            currently_offline = eq.status in ("Offline", "Encrypted") or is_parent_offline
            affected_status[node_id] = currently_offline
            for child_id in adj.get(node_id, []):
                propagate_offline(child_id, currently_offline)

        all_ids = set(eq_map.keys())
        roots = [rid for rid in all_ids if rid not in parent_map]
        for root_id in roots:
            propagate_offline(root_id, False)

        return {
            "roots": roots,
            "affected_status": affected_status,
            "equipment": [
                {
                    "id": eq.id,
                    "name": eq.name,
                    "status": eq.status,
                    "parent_id": eq.parent_id,
                    "is_parent_offline": affected_status.get(eq.id, False),
                }
                for eq in all_eq
            ],
        }
    finally:
        db.close()


@router.get("/api/v1/debug/simulation/stats")
def _debug_simulation_stats():
    """Returns counters that explain why attacks may stop."""
    from database import SessionLocal
    import models

    db = SessionLocal()
    try:
        all_eq = db.query(models.Equipment).all()
        eq_map = {eq.id: eq for eq in all_eq}

        status_counts = {}
        for eq in all_eq:
            status_counts[eq.status] = status_counts.get(eq.status, 0) + 1

        available = [
            eq for eq in all_eq
            if eq.status in ("Online", "Rebooting", "Unreachable", "Offline")
        ]
        available_no_active = [
            eq for eq in available
            if eq.id not in simulation_manager.active_attacks
        ]

        return {
            "is_running": simulation_manager.is_running,
            "phase": simulation_manager.current_phase,
            "status_counts": status_counts,
            "total_equipment": len(all_eq),
            "available_for_attack": len(available),
            "available_not_attacked": len(available_no_active),
            "active_attacks_count": len(simulation_manager.active_attacks),
            "attack_history": simulation_manager.attack_history,
            "reason": (
                "No available equipment"
                if len(available_no_active) == 0 and len(available) > 0
                else "No equipment at all"
                if len(available) == 0
                else "All available equipment already has active attacks"
                if len(available) > 0 and len(available_no_active) == 0
                else "Simulation is running normally"
            ),
        }
    finally:
        db.close()