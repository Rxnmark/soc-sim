from datetime import datetime, timezone, timedelta

# Use Europe/Kiev timezone (UTC+3)
LOCAL_TZ = timezone(timedelta(hours=3))
from fastapi import FastAPI, Depends
from sqlalchemy.orm import Session
import models
from models import ThreatArchive
from database import get_db, security_logs_collection
from schemas import ThreatResponse, SecurityLog, FixRequest, SimulationStatus, FixResponse
from threats import generate_random_threat
from simulation import SimulationManager
from main_routes import get_threat_statistics, archive_threat, get_archived_threats
from main_reset import setup_reset
from simulation_endpoints import register_simulation_routes, simulation_manager
from debug_simulation import router as debug_router

# --- 1. RISK SUMMARY ---
def setup_risk_summary(app: FastAPI):
    @app.get("/api/v1/risks/summary")
    def get_risk_summary(db: Session = Depends(get_db)):
        sensors_offline = db.query(models.Equipment).filter(models.Equipment.status != "Online").count()
        # Рахуємо обладнання за найвищим ризиком (як в таблиці)
        # Priority: Critical=4 > High=3 > Medium=2 > Warning=1
        risk_priority = {"Critical": 4, "High": 3, "Medium": 2, "Warning": 1}
        
        # Отримуємо всі незрішені ризики (окрім Warning)
        all_risks = db.query(models.RiskAssessment).filter(
            models.RiskAssessment.is_resolved == False,
            models.RiskAssessment.risk_level != "Warning"
        ).all()
        
        # Для кожної одиниці знаходимо найвищий ризик
        equipment_max_risk = {}
        for r in all_risks:
            eq_id = r.equipment_id
            priority = risk_priority.get(r.risk_level, 0)
            if eq_id not in equipment_max_risk or priority > equipment_max_risk[eq_id][0]:
                equipment_max_risk[eq_id] = (priority, r.risk_level)
        
        critical_threats = sum(1 for _, (p, level) in equipment_max_risk.items() if level == "Critical")
        high_risks = sum(1 for _, (p, level) in equipment_max_risk.items() if level == "High")
        medium_risks = sum(1 for _, (p, level) in equipment_max_risk.items() if level == "Medium")
        total_business_risks = db.query(models.BusinessRisk).count()
        mitigated_risks = db.query(models.BusinessRisk).filter(models.BusinessRisk.status == "Mitigated").count()
        mitigation_rate = int((mitigated_risks / total_business_risks) * 100) if total_business_risks > 0 else 0
        financial_exposure = simulation_manager.financial_exposure if simulation_manager.is_running else 0.0
        return {
            "critical_threats": critical_threats,
            "high_risks": high_risks,
            "medium_risks": medium_risks,
            "sensors_offline": sensors_offline,
            "financial_exposure": f"${financial_exposure / 1000000:.2f}M" if financial_exposure >= 1000000 else f"${financial_exposure:,.0f}",
            "financial_exposure_numeric": financial_exposure,
            "total_risks": total_business_risks,
            "mitigation_rate": mitigation_rate,
        }
    return get_risk_summary

# --- 2. BUSINESS RISKS ---
def setup_business_risks(app: FastAPI):
    @app.get("/api/v1/business-risks")
    def get_business_risks(db: Session = Depends(get_db)):
        return db.query(models.BusinessRisk).all()
    return get_business_risks

# --- 3. EQUIPMENT ---
def setup_equipment(app: FastAPI):
    @app.get("/api/v1/equipment")
    def get_all_equipment(db: Session = Depends(get_db)):
        equipments = db.query(models.Equipment).all()
        result = []
        for eq in equipments:
            all_risks = (
                db.query(models.RiskAssessment)
                .filter(models.RiskAssessment.equipment_id == eq.id)
                .all()
            )
            # Warning атаки не впливають на стан обладнання в таблиці
            unresolved_risks = [r for r in all_risks if not r.is_resolved and r.risk_level != "Warning"]
            
            # Priority: Critical > High > Medium
            risk_priority = {"Critical": 4, "High": 3, "Medium": 2}
            highest_risk = None
            if unresolved_risks:
                highest_risk = max(unresolved_risks, key=lambda r: risk_priority.get(r.risk_level, 0))
            
            financial_impact = sum(r.financial_impact for r in unresolved_risks) if unresolved_risks else 0
            result.append({
                "id": eq.id, "name": eq.name, "type": eq.type, "ip_address": eq.ip_address,
                "status": eq.status, "risk_level": highest_risk.risk_level if highest_risk else "Safe",
                "parent_id": eq.parent_id, "financial_impact": financial_impact,
                "_debug_risks": [{
                    "id": r.id, "level": r.risk_level, "resolved": r.is_resolved,
                    "type": r.attack_type, "desc": r.description[:80]
                } for r in all_risks[:5]],
            })
        return result
    return get_all_equipment

def setup_threats(app: FastAPI):
    @app.get("/api/v1/threats", response_model=list[ThreatResponse])
    def read_threats(db: Session = Depends(get_db)):
        threats = db.query(models.Threat).filter(
            models.Threat.category.notin_(["Minor", "Warning"])
        ).order_by(models.Threat.timestamp.desc()).all()
        if not threats:
            generate_random_threat(db)
            threats = db.query(models.Threat).filter(
                models.Threat.category.notin_(["Minor", "Warning"])
            ).order_by(models.Threat.timestamp.desc()).all()
        return threats

    @app.post("/api/v1/threats/simulate")
    def simulate_threat(db: Session = Depends(get_db)):
        """Endpoint to manually trigger a new threat for testing."""
        return generate_random_threat(db)
    return read_threats, simulate_threat

# --- 4. LOGS ---
def setup_logs(app: FastAPI):
    @app.post("/api/v1/logs")
    async def create_security_log(log: SecurityLog, db: Session = Depends(get_db)):
        log_doc = log.model_dump()
        log_doc["timestamp"] = datetime.now(LOCAL_TZ)
        result = await security_logs_collection.insert_one(log_doc)
        event_lower = log.event_type.lower()
        if "unauthorized" in event_lower or "attack" in event_lower or "scan" in event_lower:
            eq = db.query(models.Equipment).filter(models.Equipment.ip_address == log.source_ip).first()
            if eq:
                if simulation_manager.active_attacks.get(eq.id):
                    return {"message": "Log saved", "id": str(result.inserted_id)}
                if not db.query(models.RiskAssessment).filter(
                    models.RiskAssessment.equipment_id == eq.id, models.RiskAssessment.is_resolved == False
                ).first():
                    db.add(models.RiskAssessment(equipment_id=eq.id, risk_level="Critical", description=f"Auto-detected threat: {log.description}", is_resolved=False))
                    db.commit()
        return {"message": "Log saved", "id": str(result.inserted_id)}

    @app.get("/api/v1/logs")
    async def get_security_logs(limit: int = 1000):
        now = datetime.now(LOCAL_TZ)
        start_of_day = now.replace(hour=0, minute=0, second=0, microsecond=0)
        end_of_day = start_of_day + timedelta(days=1)
        logs_cursor = security_logs_collection.find({
            "timestamp": {
                "$gte": start_of_day,
                "$lt": end_of_day
            }
        }).sort("timestamp", -1).limit(limit)
        logs = await logs_cursor.to_list(length=limit)
        for log in logs:
            log["_id"] = str(log["_id"])
        return logs
    return create_security_log, get_security_logs

# --- 5. THREAT STATISTICS & ARCHIVE ---
def setup_threat_stats(app: FastAPI):
    @app.get("/api/v1/threats/statistics")
    async def get_threat_statistics_endpoint():
        return await get_threat_statistics()

    @app.post("/api/v1/threats/archive")
    async def archive_threat_endpoint(request: FixRequest, db: Session = Depends(get_db)):
        return await archive_threat(request, db)

    @app.get("/api/v1/threats/archived")
    def get_archived_threats_endpoint(limit: int = 100, db: Session = Depends(get_db)):
        return get_archived_threats(limit, db)
    return get_threat_statistics_endpoint, archive_threat_endpoint, get_archived_threats_endpoint

def register_all_routes(app: FastAPI):
    """Register all API routes on the app."""
    setup_risk_summary(app)
    setup_business_risks(app)
    setup_equipment(app)
    setup_threats(app)
    setup_logs(app)
    setup_threat_stats(app)
    setup_reset(app)