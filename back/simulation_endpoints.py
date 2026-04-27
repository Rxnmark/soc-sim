"""
Simulation game endpoints for the cybersecurity dashboard game.
Imported by main.py to keep files under 250 lines.
"""
import asyncio
from datetime import datetime, timezone, timedelta

# Use Europe/Kiev timezone (UTC+3)
LOCAL_TZ = timezone(timedelta(hours=3))
from fastapi import Depends, Query, BackgroundTasks
from sqlalchemy.orm import Session
from database import SessionLocal, security_logs_collection, get_db
import models
from schemas import SimulationStatus, FixRequest
from simulation import SimulationManager

simulation_manager = SimulationManager()

# Keys used to classify threats as high/critical (same logic as expert-utils.tsx classifyThreat)
CRITICAL_KEYS = ["syn flood", "traffic flood", "slowloris", "udp flood", "dns amplification", "ddos", "http flood", "ntp amplification", "offline"]
ACTIVE_KEYS = ["ransomware", "exfiltration", "spyware", "data leak", "covert channel", "cryptolocker", "encryption attack"]


def _is_high_or_critical(event_type: str) -> bool:
    """Check if an event type is high (active) or critical severity."""
    lower = event_type.lower()
    for k in CRITICAL_KEYS:
        if k in lower:
            return True
    for k in ACTIVE_KEYS:
        if k in lower:
            return True
    return False


# ------------------------------------------------------------------
# Simulation game endpoints
# ------------------------------------------------------------------
def register_simulation_routes(app):
    @app.get("/api/v1/simulation/status", response_model=SimulationStatus)
    def _get_simulation_status():
        return simulation_manager.get_status()

    @app.post("/api/v1/simulation/fix")
    async def _apply_simulation_fix(equipment_id: int = Query(..., alias="equipment_id"), db: Session = Depends(get_db)):
        result = await simulation_manager.apply_fix(equipment_id)
        if result["status"] == "success":
            eq = db.query(models.Equipment).filter(models.Equipment.id == equipment_id).first()
            if eq:
                await security_logs_collection.insert_one({
                    "event_type": "Simulation Fix Applied",
                    "description": f"User resolved {result.get('attack_type', 'attack')} on {eq.name}.",
                    "source_ip": eq.ip_address,
                    "timestamp": datetime.now(LOCAL_TZ)
                })
        return result

    @app.post("/api/v1/simulation/start")
    async def _start_simulation():
        await simulation_manager.start()
        return {"status": "started"}

    @app.post("/api/v1/simulation/stop")
    async def _stop_simulation():
        simulation_manager.stop()
        return {"status": "stopped"}

    # ------------------------------------------------------------------
    # Auto-fix endpoints
    # ------------------------------------------------------------------
    async def reboot_equipment(equipment_id: int):
        await asyncio.sleep(5)
        db = SessionLocal()
        try:
            eq = db.query(models.Equipment).filter(models.Equipment.id == equipment_id).first()
            if eq:
                eq.status = "Online"
                db.commit()

                # Remove from active_attacks if present so the device can be attacked again
                if equipment_id in simulation_manager.active_attacks:
                    del simulation_manager.active_attacks[equipment_id]

                await simulation_manager._update_topology_dependencies(db)
        finally:
            db.close()

    def _block_equipment(request: FixRequest, db: Session, background_tasks: BackgroundTasks):
        """Block a source IP and reboot the corresponding equipment. Returns (equipment, target_name)."""
        # Find equipment by unresolved risk_assessment (most recent attack target)
        # source_ip is the attacker's IP, not the target equipment's IP
        active_risk = db.query(models.RiskAssessment).filter(
            models.RiskAssessment.is_resolved == False
        ).order_by(models.RiskAssessment.created_at.desc()).first()
        equipment = None
        if active_risk:
            equipment = db.query(models.Equipment).filter(
                models.Equipment.id == active_risk.equipment_id
            ).first()
        if equipment:
            if equipment.id in simulation_manager.active_attacks:
                del simulation_manager.active_attacks[equipment.id]
            equipment.status = "Rebooting"
            db.query(models.RiskAssessment).filter(
                models.RiskAssessment.equipment_id == equipment.id,
                models.RiskAssessment.is_resolved == False
            ).update({"is_resolved": True})
            db.commit()
            target_name = f"внутрiшнього пристрою {equipment.name}"
            background_tasks.add_task(reboot_equipment, equipment.id)
        else:
            target_name = "зовнiшнього атакуючого"
        return equipment, target_name

    @app.post("/api/v1/actions/block")
    async def _apply_auto_fix(request: FixRequest, background_tasks: BackgroundTasks, db: Session = Depends(get_db)):
        equipment, target_name = _block_equipment(request, db, background_tasks)
        await security_logs_collection.insert_one({
            "event_type": "Auto-Fix Applied",
            "description": f"Система заблокувала доступ для {target_name} (IP: {request.source_ip}).",
            "source_ip": request.source_ip,
            "timestamp": datetime.now(LOCAL_TZ)
        })
        return {"status": "success"}

    @app.post("/api/v1/threats/archive-and-reboot")
    async def _archive_and_reboot(request: FixRequest, background_tasks: BackgroundTasks, db: Session = Depends(get_db)):
        """Archive threat, block IP, then check for remaining attacks. If none, reboot all unsafe equipment."""
        # 1. Archive the threat
        from main_routes import archive_threat
        await archive_threat(request, db)

        # 2. Block the equipment
        equipment, target_name = _block_equipment(request, db, background_tasks)
        await security_logs_collection.insert_one({
            "event_type": "Auto-Fix Applied",
            "description": f"Система заблокувала доступ для {target_name} (IP: {request.source_ip}).",
            "source_ip": request.source_ip,
            "timestamp": datetime.now(LOCAL_TZ)
        })

        # 3. Check if there are still unresolved attacks (excluding Warning)
        remaining_attacks = db.query(models.RiskAssessment).filter(
            models.RiskAssessment.is_resolved == False,
            models.RiskAssessment.risk_level != "Warning"
        ).count()

        # 4. Only reboot all unsafe equipment if there are no remaining attacks
        if remaining_attacks == 0:
            unsafe_equipment = db.query(models.Equipment).filter(
                models.Equipment.status != "Online"
            ).all()
            for eq in unsafe_equipment:
                if eq.id in simulation_manager.active_attacks:
                    del simulation_manager.active_attacks[eq.id]
                eq.status = "Rebooting"
                db.query(models.RiskAssessment).filter(
                    models.RiskAssessment.equipment_id == eq.id,
                    models.RiskAssessment.is_resolved == False
                ).update({"is_resolved": True})
                db.commit()
                background_tasks.add_task(reboot_equipment, eq.id)
                await security_logs_collection.insert_one({
                    "event_type": "Auto-Fix Applied",
                    "description": f"Автоматичне перезавантаження обладнання {eq.name} (усі загрози усунуто).",
                    "source_ip": eq.ip_address,
                    "timestamp": datetime.now(LOCAL_TZ),
                })

        return {"status": "success"}
