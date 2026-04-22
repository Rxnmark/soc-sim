"""
Simulation game endpoints for the cybersecurity dashboard game.
Imported by main.py to keep files under 250 lines.
"""
import asyncio
from datetime import datetime, timezone
from fastapi import Depends, Query, BackgroundTasks
from sqlalchemy.orm import Session
from database import SessionLocal, security_logs_collection, get_db
import models
from schemas import SimulationStatus, FixRequest
from simulation import SimulationManager

simulation_manager = SimulationManager()


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
                    "timestamp": datetime.now(timezone.utc)
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
        finally:
            db.close()

    @app.post("/api/v1/actions/block")
    async def _apply_auto_fix(request: FixRequest, background_tasks: BackgroundTasks, db: Session = Depends(get_db)):
        equipment = None
        equipment = db.query(models.Equipment).filter(
            models.Equipment.ip_address == request.source_ip,
            models.Equipment.status == "Online"
        ).first()
        if not equipment:
            active_risk = db.query(models.RiskAssessment).filter(
                models.RiskAssessment.is_resolved == False
            ).order_by(models.RiskAssessment.created_at.desc()).first()
            if active_risk:
                equipment = db.query(models.Equipment).filter(
                    models.Equipment.id == active_risk.equipment_id
                ).first()
        if equipment:
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
        await security_logs_collection.insert_one({
            "event_type": "Auto-Fix Applied",
            "description": f"Система заблокувала доступ для {target_name} (IP: {request.source_ip}).",
            "source_ip": request.source_ip,
            "timestamp": datetime.now(timezone.utc)
        })
        return {"status": "success"}
