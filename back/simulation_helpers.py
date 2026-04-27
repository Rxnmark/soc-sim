"""
Helper functions for the cybersecurity simulation.
Contains attack effects, ransomware scheduling, and utility logic.
Imported by simulation_core.py to keep files under 250 lines.
"""
import asyncio
from datetime import timezone, timedelta

LOCAL_TZ = timezone(timedelta(hours=3))
from database import security_logs_collection
import models
from sqlalchemy.orm import Session
from attack_definitions import SIMULATION_ATTACKS


def apply_attack_effect(target, attack_category: str, db: Session, simulation_ref):
    """Apply the effect of an attack on the target equipment."""
    if attack_category == "DDoS":
        target.status = "Offline"
    elif attack_category == "Stealth":
        pass
    elif attack_category == "Ransomware":
        asyncio.create_task(schedule_ransomware_encryption(target.id, db, simulation_ref))
    elif attack_category == "Minor":
        # Minor attacks don't affect equipment status
        pass
    else:
        pass
    print(f"[SIM] _apply_attack_effect: target.id={target.id}, status={target.status}")


async def schedule_ransomware_encryption(equipment_id: int, db: Session, simulation_ref):
    """Schedule a ransomware encryption after the timeout period."""
    ransomware_config = SIMULATION_ATTACKS["Ransomware"]
    await asyncio.sleep(ransomware_config["ransomware_timeout_seconds"])

    if not simulation_ref.is_running or equipment_id not in simulation_ref.active_attacks:
        return

    attack_data = simulation_ref.active_attacks.get(equipment_id)
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

            if simulation_ref.is_running:
                eq = db.query(models.Equipment).filter(models.Equipment.id == equipment_id).first()
                if eq and eq.status == "Encrypted":
                    eq.status = "Online"
                    db.commit()
                    # Ransomware ризик НЕ резолвиться автоматично — тільки користувач може усунути загрозу
                    # Ризик залишається is_resolved = False доки користувач не заблокує source_ip

                    if equipment_id in simulation_ref.active_attacks:
                        del simulation_ref.active_attacks[equipment_id]

                    # CRITICAL: RiskAssessment залишається is_resolved=False
                    # Ризик НЕ резолвиться автоматично - тільки користувач може усунути загрозу
                    await simulation_ref._update_topology_dependencies(db)
    finally:
        db.close()