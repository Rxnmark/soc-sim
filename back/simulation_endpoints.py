"""
Simulation game endpoints for the cybersecurity dashboard game.
Imported by main.py to keep files under 250 lines.
"""
import asyncio
from datetime import datetime, timezone, timedelta

from fastapi import Depends, Query, BackgroundTasks
from sqlalchemy.orm import Session
from database import SessionLocal, security_logs_collection, get_db
import models
from schemas import SimulationStatus, FixRequest
from simulation import SimulationManager

# Use Europe/Kiev timezone (UTC+3)
LOCAL_TZ = timezone(timedelta(hours=3))

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
def register_simulation_routes(app, dependencies=None):
    if dependencies is None:
        dependencies = []

    @app.get("/api/v1/simulation/status", response_model=SimulationStatus, dependencies=dependencies)
    def _get_simulation_status():
        return simulation_manager.get_status()

    @app.post("/api/v1/simulation/fix", dependencies=dependencies)
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

    @app.post("/api/v1/simulation/start", dependencies=dependencies)
    async def _start_simulation():
        await simulation_manager.start()
        return {"status": "started"}

    @app.post("/api/v1/simulation/stop", dependencies=dependencies)
    async def _stop_simulation():
        simulation_manager.stop()
        return {"status": "stopped"}

    @app.post("/api/v1/simulation/pause", dependencies=dependencies)
    async def _pause_simulation():
        simulation_manager.is_paused = True
        return {"status": "paused"}

    @app.post("/api/v1/simulation/resume", dependencies=dependencies)
    async def _resume_simulation():
        simulation_manager.is_paused = False
        return {"status": "resumed"}

    @app.post("/api/v1/simulation/speed", dependencies=dependencies)
    async def _set_speed(request: dict):
        speed_multiplier = request.get("speed_multiplier", 1.0)
        simulation_manager.speed_multiplier = float(speed_multiplier)
        return {"status": "ok", "speed_multiplier": simulation_manager.speed_multiplier}

    @app.post("/api/v1/simulation/clear-ghosts", dependencies=dependencies)
    async def clear_ghosts(db: Session = Depends(get_db)):
        """Failsafe to clear stale active_attacks if the system desyncs."""
        simulation_manager.active_attacks.clear()
        db.query(models.RiskAssessment).filter(
            models.RiskAssessment.is_resolved == False
        ).update({"is_resolved": True})
        db.commit()
        return {"status": "ghosts_cleared"}

    # ------------------------------------------------------------------
    # Auto-fix endpoints
    # ------------------------------------------------------------------
    async def reboot_equipment(equipment_id: int):
        """Background task: wait for recovery time, then set equipment back to Online."""
        await asyncio.sleep(5)
        db = SessionLocal()
        try:
            eq = db.query(models.Equipment).filter(models.Equipment.id == equipment_id).first()
            if eq:
                eq.status = "Online"
                db.commit()
                if equipment_id in simulation_manager.active_attacks:
                    del simulation_manager.active_attacks[equipment_id]
                await simulation_manager._update_topology_dependencies(db)
        finally:
            db.close()

    async def _block_equipment(request: FixRequest, db: Session, background_tasks: BackgroundTasks):
        """Block a source IP and reboot the corresponding equipment. Returns (equipment, target_name).
        
        Uses target_equipment_id from request if provided, otherwise falls back to 
        finding the most recent unresolved risk_assessment.
        """
        equipment = None
        target_name = "зовнiшнього атакуючого"
        
        # Priority 1: Use target_equipment_id from request (explicit target from frontend)
        target_id = getattr(request, 'target_equipment_id', None)
        if target_id:
            equipment = db.query(models.Equipment).filter(
                models.Equipment.id == target_id
            ).first()
        
        # Priority 2: Find equipment by the most recent unresolved risk_assessment
        if not equipment:
            active_risk = db.query(models.RiskAssessment).filter(
                models.RiskAssessment.is_resolved == False
            ).order_by(models.RiskAssessment.created_at.desc()).first()
            if active_risk:
                equipment = db.query(models.Equipment).filter(
                    models.Equipment.id == active_risk.equipment_id
                ).first()
        
        # Priority 3: Find by source_ip matching equipment IP
        if not equipment:
            equipment = db.query(models.Equipment).filter(
                models.Equipment.ip_address == request.source_ip
            ).first()
        
        if equipment:
            # Remove from active_attacks so device can be attacked again
            if equipment.id in simulation_manager.active_attacks:
                del simulation_manager.active_attacks[equipment.id]
            equipment.status = "Rebooting"
            # Resolve all unresolved risks for this equipment
            db.query(models.RiskAssessment).filter(
                models.RiskAssessment.equipment_id == equipment.id,
                models.RiskAssessment.is_resolved == False
            ).update({"is_resolved": True})
            db.commit()
            target_name = f"внутрiшнього пристрою {equipment.name}"
            background_tasks.add_task(reboot_equipment, equipment.id)
        return equipment, target_name

    @app.post("/api/v1/actions/block", dependencies=dependencies)
    async def _apply_auto_fix(request: FixRequest, background_tasks: BackgroundTasks, db: Session = Depends(get_db)):
        equipment, target_name = await _block_equipment(request, db, background_tasks)
        await security_logs_collection.insert_one({
            "event_type": "Auto-Fix Applied",
            "description": f"Система заблокувала доступ для {target_name} (IP: {request.source_ip}).",
            "source_ip": request.source_ip,
            "timestamp": datetime.now(LOCAL_TZ)
        })
        from main_routes import archive_threat
        await archive_threat(request, db)
        return {"status": "success"}

    @app.post("/api/v1/threats/archive-and-reboot", dependencies=dependencies)
    async def _archive_and_reboot(request: FixRequest, background_tasks: BackgroundTasks, db: Session = Depends(get_db)):
        """Archive threat, block source IP, reboot targeted equipment, then check for remaining attacks.
        
        If no remaining attacks, reboot ALL unsafe equipment (including cascade-damaged devices).
        """
        # 1. Archive the threat
        from main_routes import archive_threat
        await archive_threat(request, db)

        # 2. Block and reboot the targeted equipment
        equipment, target_name = await _block_equipment(request, db, background_tasks)
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
                    attack_data = simulation_manager.active_attacks[eq.id]
                    from main_routes import archive_threat
                    archive_req = FixRequest(source_ip=attack_data["source_ip"], target_equipment_id=eq.id)
                    await archive_threat(archive_req, db)
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
                    "description": f"Автоматичне перезавантаження обладнання {eq.name} (усi загрози усунуто).",
                    "source_ip": eq.ip_address,
                    "timestamp": datetime.now(LOCAL_TZ),
                })

        return {"status": "success"}
