import asyncio
from datetime import datetime, timezone
from fastapi import FastAPI, Depends, BackgroundTasks, Query
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
import models
from models import ThreatArchive
from database import engine, Base, get_db, SessionLocal, security_logs_collection
from schemas import ThreatResponse, SecurityLog, FixRequest, SimulationStatus, FixResponse
from threats import generate_random_threat
from simulation import SimulationManager
from main_routes import get_threat_statistics, archive_threat, get_archived_threats
from simulation_endpoints import register_simulation_routes

# Global simulation manager instance
simulation_manager = SimulationManager()

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
register_simulation_routes(app)

# --- 1. RISK SUMMARY ---
@app.get("/api/v1/risks/summary")
def get_risk_summary(db: Session = Depends(get_db)):
    sensors_offline = db.query(models.Equipment).filter(models.Equipment.status != "Online").count()
    critical_threats = db.query(models.RiskAssessment).filter(
        models.RiskAssessment.risk_level == "Critical", models.RiskAssessment.is_resolved == False
    ).count()
    medium_risks = db.query(models.RiskAssessment).filter(
        models.RiskAssessment.risk_level == "Medium", models.RiskAssessment.is_resolved == False
    ).count()
    total_business_risks = db.query(models.BusinessRisk).count()
    mitigated_risks = db.query(models.BusinessRisk).filter(models.BusinessRisk.status == "Mitigated").count()
    mitigation_rate = int((mitigated_risks / total_business_risks) * 100) if total_business_risks > 0 else 0
    financial_exposure = simulation_manager.financial_exposure if simulation_manager.is_running else 0.0
    return {
        "critical_threats": critical_threats,
        "medium_risks": medium_risks,
        "sensors_offline": sensors_offline,
        "financial_exposure": f"${financial_exposure / 1000000:.2f}M" if financial_exposure >= 1000000 else f"${financial_exposure:,.0f}",
        "financial_exposure_numeric": financial_exposure,
        "total_risks": total_business_risks,
        "mitigation_rate": mitigation_rate,
    }

# --- 2. BUSINESS RISKS ---
@app.get("/api/v1/business-risks")
def get_business_risks(db: Session = Depends(get_db)):
    return db.query(models.BusinessRisk).all()

# --- 3. EQUIPMENT ---
@app.get("/api/v1/equipment")
def get_all_equipment(db: Session = Depends(get_db)):
    equipments = db.query(models.Equipment).all()
    result = []
    for eq in equipments:
        highest_risk = (
            db.query(models.RiskAssessment)
            .filter(models.RiskAssessment.equipment_id == eq.id, models.RiskAssessment.is_resolved == False)
            .order_by(models.RiskAssessment.risk_level.desc())
            .first()
        )
        financial_impact = highest_risk.financial_impact if highest_risk and hasattr(highest_risk, "financial_impact") else 0
        result.append({
            "id": eq.id, "name": eq.name, "type": eq.type, "ip_address": eq.ip_address,
            "status": eq.status, "risk_level": highest_risk.risk_level if highest_risk else "Safe",
            "parent_id": eq.parent_id, "financial_impact": financial_impact,
        })
    return result

@app.get("/api/v1/threats", response_model=list[ThreatResponse])
def read_threats(db: Session = Depends(get_db)):
    threats = db.query(models.Threat).order_by(models.Threat.timestamp.desc()).all()
    if not threats:
        generate_random_threat(db)
        threats = db.query(models.Threat).order_by(models.Threat.timestamp.desc()).all()
    return threats

@app.post("/api/v1/threats/simulate")
def simulate_threat(db: Session = Depends(get_db)):
    """Endpoint to manually trigger a new threat for testing."""
    return generate_random_threat(db)

@app.post("/api/v1/logs")
async def create_security_log(log: SecurityLog, db: Session = Depends(get_db)):
    log_doc = log.model_dump()
    log_doc["timestamp"] = datetime.now(timezone.utc)
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
    logs_cursor = security_logs_collection.find().sort("timestamp", -1).limit(limit)
    logs = await logs_cursor.to_list(length=limit)
    for log in logs:
        log["_id"] = str(log["_id"])
    return logs

# --- 4. THREAT STATISTICS & ARCHIVE ---
@app.get("/api/v1/threats/statistics")
async def get_threat_statistics_endpoint():
    return await get_threat_statistics()

@app.post("/api/v1/threats/archive")
async def archive_threat_endpoint(request: FixRequest, db: Session = Depends(get_db)):
    return await archive_threat(request, db)

@app.get("/api/v1/threats/archived")
def get_archived_threats_endpoint(limit: int = 100, db: Session = Depends(get_db)):
    return get_archived_threats(limit, db)

# --- 5. RESET DATABASE ---
@app.post("/api/v1/reset")
async def reset_database(db: Session = Depends(get_db)):
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)
    equipment_data = [
        {"name": "Main Gateway Router", "type": "Network", "ip_address": "192.168.1.1", "status": "Online"},
        {"name": "Core Switch Alpha", "type": "Network", "ip_address": "192.168.1.2", "status": "Online"},
        {"name": "Auth Server (AD)", "type": "Server", "ip_address": "192.168.1.10", "status": "Online"},
        {"name": "Database Cluster Node 1", "type": "Database", "ip_address": "192.168.1.20", "status": "Online"},
        {"name": "Database Cluster Node 2", "type": "Database", "ip_address": "192.168.1.21", "status": "Online"},
        {"name": "Web Server Prod-1", "type": "Server", "ip_address": "192.168.2.15", "status": "Online"},
        {"name": "Web Server Prod-2", "type": "Server", "ip_address": "192.168.2.16", "status": "Online"},
        {"name": "SCADA Control Unit A", "type": "ICS", "ip_address": "10.0.0.5", "status": "Online"},
        {"name": "Cooling System PLC", "type": "ICS", "ip_address": "10.0.0.12", "status": "Online"},
        {"name": "Wind Turbine 1 Telemetry", "type": "Sensor", "ip_address": "10.0.1.50", "status": "Online"},
        {"name": "Wind Turbine 2 Telemetry", "type": "Sensor", "ip_address": "10.0.1.51", "status": "Online"},
        {"name": "Solar Array B Inverter", "type": "Sensor", "ip_address": "10.0.1.60", "status": "Online"},
        {"name": "Perimeter Camera 01", "type": "IoT", "ip_address": "172.16.0.101", "status": "Online"},
        {"name": "Perimeter Camera 02", "type": "IoT", "ip_address": "172.16.0.102", "status": "Online"},
        {"name": "Smart HVAC Controller", "type": "IoT", "ip_address": "172.16.0.200", "status": "Online"},
        {"name": "CEO Workstation", "type": "Endpoint", "ip_address": "192.168.5.10", "status": "Online"},
        {"name": "DevSecOps Terminal", "type": "Endpoint", "ip_address": "192.168.5.42", "status": "Online"},
        {"name": "Backup NAS Server", "type": "Server", "ip_address": "192.168.2.100", "status": "Online"},
        {"name": "Email Exchange Server", "type": "Server", "ip_address": "192.168.1.50", "status": "Online"},
        {"name": "Guest WiFi Gateway", "type": "Network", "ip_address": "172.16.1.1", "status": "Online"},
    ]
    eq_objects = []
    for eq in equipment_data:
        new_eq = models.Equipment(**eq)
        db.add(new_eq)
        eq_objects.append(new_eq)
    db.commit()
    br1 = models.BusinessRisk(title="Ransomware Attack on SCADA", category="Cyber", probability=3, impact=5, status="Open")
    br2 = models.BusinessRisk(title="Supply Chain Disruption", category="Operational", probability=4, impact=4, status="In Progress")
    br3 = models.BusinessRisk(title="Regulatory Compliance Fine", category="Financial", probability=2, impact=3, status="Mitigated")
    br4 = models.BusinessRisk(title="DDoS Attack on Main Gateway", category="Cyber", probability=5, impact=2, status="Open")
    br5 = models.BusinessRisk(title="Insider Data Theft", category="Cyber", probability=2, impact=5, status="Mitigated")
    db.add_all([br1, br2, br3, br4, br5])
    db.commit()
    await security_logs_collection.delete_many({})
    await simulation_manager.start()
    return {"message": "Database reset! Simulation game started. Attacks will begin shortly."}