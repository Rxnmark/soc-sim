import asyncio
from datetime import datetime
from fastapi import FastAPI, Depends, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from pydantic import BaseModel
import models
from database import engine, Base, get_db, SessionLocal, security_logs_collection

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- 1. СТАТИСТИКА (ОНОВЛЕНА ДЛЯ ОБИДВОХ ДАШБОРДІВ) ---
@app.get("/api/v1/risks/summary")
def get_risk_summary(db: Session = Depends(get_db)):
    # Дані для Cybersecurity Dashboard
    sensors_offline = db.query(models.Equipment).filter(models.Equipment.status != "Online").count()
    critical_threats = db.query(models.RiskAssessment).filter(models.RiskAssessment.risk_level == "Critical", models.RiskAssessment.is_resolved == False).count()
    medium_risks = db.query(models.RiskAssessment).filter(models.RiskAssessment.risk_level == "Medium", models.RiskAssessment.is_resolved == False).count()
    
    # Дані для Risk Management Dashboard
    total_business_risks = db.query(models.BusinessRisk).count()
    mitigated_risks = db.query(models.BusinessRisk).filter(models.BusinessRisk.status == "Mitigated").count()
    
    # Рахуємо відсоток вирішених ризиків (Mitigation Rate)
    if total_business_risks > 0:
        mitigation_rate = int((mitigated_risks / total_business_risks) * 100)
    else:
        mitigation_rate = 0

    return {
        "critical_threats": critical_threats,
        "medium_risks": medium_risks,
        "sensors_offline": sensors_offline,
        "financial_exposure": "$8.85M",
        "total_risks": total_business_risks,     # НОВЕ
        "mitigation_rate": mitigation_rate       # НОВЕ
    }


# --- 2. НОВИЙ МАРШРУТ ДЛЯ МАТРИЦІ РИЗИКІВ ---
@app.get("/api/v1/business-risks")
def get_business_risks(db: Session = Depends(get_db)):
    # Віддаємо всі бізнес-ризики для побудови матриці
    return db.query(models.BusinessRisk).all()

# --- 3. ТАБЛИЦЯ ОБЛАДНАННЯ ---
@app.get("/api/v1/equipment")
def get_all_equipment(db: Session = Depends(get_db)):
    equipments = db.query(models.Equipment).all()
    result = []
    for eq in equipments:
        highest_risk = db.query(models.RiskAssessment)\
            .filter(models.RiskAssessment.equipment_id == eq.id, models.RiskAssessment.is_resolved == False)\
            .order_by(models.RiskAssessment.risk_level.desc())\
            .first()
            
        result.append({
            "id": eq.id,
            "name": eq.name,
            "type": eq.type,
            "ip_address": eq.ip_address,
            "status": eq.status, # Віддаємо реальний статус
            "risk_level": highest_risk.risk_level if highest_risk else "Safe",
            "parent_id": eq.parent_id
        })
    return result

# --- 4. ЛОГИ (Без змін) ---
class SecurityLog(BaseModel):
    event_type: str
    description: str
    source_ip: str

@app.post("/api/v1/logs")
async def create_security_log(log: SecurityLog, db: Session = Depends(get_db)):
    log_doc = log.model_dump()
    log_doc["timestamp"] = datetime.utcnow()
    result = await security_logs_collection.insert_one(log_doc)

    # --- ЕКСПЕРТНА СИСТЕМА: Автоматичний аналіз ---
    event_lower = log.event_type.lower()
    # Якщо лог підозрілий, шукаємо пристрій і створюємо загрозу
    if "unauthorized" in event_lower or "attack" in event_lower or "scan" in event_lower:
        eq = db.query(models.Equipment).filter(models.Equipment.ip_address == log.source_ip).first()
        if eq:
            # Перевіряємо, чи немає вже активної загрози, щоб не дублювати
            active_risk = db.query(models.RiskAssessment).filter(
                models.RiskAssessment.equipment_id == eq.id,
                models.RiskAssessment.is_resolved == False
            ).first()
            
            if not active_risk:
                new_risk = models.RiskAssessment(
                    equipment_id=eq.id,
                    risk_level="Critical",
                    description=f"Auto-detected threat: {log.description}",
                    is_resolved=False
                )
                db.add(new_risk)
                db.commit()

    return {"message": "Лог збережено", "id": str(result.inserted_id)}

@app.get("/api/v1/logs")
async def get_security_logs(limit: int = 15):
    logs_cursor = security_logs_collection.find().sort("timestamp", -1).limit(limit)
    logs = await logs_cursor.to_list(length=limit)
    for log in logs:
        log["_id"] = str(log["_id"])
    return logs

# --- 5. ЕКСПЕРТНА СИСТЕМА (РЕАГУВАННЯ) ---
async def reboot_equipment(equipment_id: int):
    await asyncio.sleep(5)  # Змінили на 5 секунд для швидкості демо
    db = SessionLocal()
    try:
        eq = db.query(models.Equipment).filter(models.Equipment.id == equipment_id).first()
        if eq:
            eq.status = "Online" 
            db.commit()
    finally:
        db.close()

class FixRequest(BaseModel):
    source_ip: str

@app.post("/api/v1/actions/block")
async def apply_auto_fix(request: FixRequest, background_tasks: BackgroundTasks, db: Session = Depends(get_db)):
    equipment = db.query(models.Equipment).filter(models.Equipment.ip_address == request.source_ip).first()
    
    if equipment:
        equipment.status = "Rebooting" # Ставимо статус перезавантаження
        
        # МАГІЯ: Позначаємо всі загрози для цього обладнання як вирішені!
        db.query(models.RiskAssessment).filter(models.RiskAssessment.equipment_id == equipment.id).update({"is_resolved": True})
        db.commit()
        
        target_name = f"внутрішнього пристрою {equipment.name}"
        background_tasks.add_task(reboot_equipment, equipment.id)
    else:
        target_name = "зовнішнього атакуючого"

    await security_logs_collection.insert_one({
        "event_type": "Auto-Fix Applied",
        "description": f"Система заблокувала доступ для {target_name} (IP: {request.source_ip}).",
        "source_ip": request.source_ip,
        "timestamp": datetime.utcnow()
    })
    
    return {"status": "success"}

# --- 6. МАРШРУТ ДЛЯ ОНОВЛЕННЯ БАЗИ ДАНИХ ---
@app.post("/api/v1/reset")
async def reset_database(db: Session = Depends(get_db)): # Додали async
    models.Base.metadata.drop_all(bind=engine)
    models.Base.metadata.create_all(bind=engine)

    # 20 ОДИНИЦЬ ОБЛАДНАННЯ ДЛЯ СИМЕТРИЧНОЇ СІТКИ
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

    # Стартові інциденти для PostgreSQL (прив'язані до конкретного обладнання)
    risk1 = models.RiskAssessment(equipment_id=eq_objects[5].id, risk_level="Critical", description="DDoS Attack Detected", is_resolved=False)
    risk2 = models.RiskAssessment(equipment_id=eq_objects[7].id, risk_level="Critical", description="Unauthorized Modbus command", is_resolved=False)
    risk3 = models.RiskAssessment(equipment_id=eq_objects[15].id, risk_level="Medium", description="Outdated Antivirus Signature", is_resolved=False)
    db.add_all([risk1, risk2, risk3])
    db.commit()

    # Бізнес-ризики
    br1 = models.BusinessRisk(title="Ransomware Attack on SCADA", category="Cyber", probability=3, impact=5, status="Open")
    br2 = models.BusinessRisk(title="Supply Chain Disruption", category="Operational", probability=4, impact=4, status="In Progress")
    br3 = models.BusinessRisk(title="Regulatory Compliance Fine", category="Financial", probability=2, impact=3, status="Mitigated")
    br4 = models.BusinessRisk(title="DDoS Attack on Main Gateway", category="Cyber", probability=5, impact=2, status="Open")
    br5 = models.BusinessRisk(title="Insider Data Theft", category="Cyber", probability=2, impact=5, status="Mitigated")
    db.add_all([br1, br2, br3, br4, br5])
    db.commit()

    # ОЧИЩАЄМО СТАРІ ТА ГЕНЕРУЄМО НОВІ ЛОГИ ДЛЯ MONGODB
    await security_logs_collection.delete_many({})
    initial_logs = [
        {
            "event_type": "DDoS Attack",
            "description": "Massive incoming traffic flood detected targeting Web Server Prod-1.",
            "source_ip": "192.168.2.15",
            "timestamp": datetime.utcnow()
        },
        {
            "event_type": "Unauthorized Access",
            "description": "Unauthorized Modbus command execution attempt on SCADA Unit A.",
            "source_ip": "10.0.0.5",
            "timestamp": datetime.utcnow()
        },
        {
            "event_type": "Security Warning",
            "description": "Outdated Antivirus Signature detected on CEO Workstation.",
            "source_ip": "192.168.5.10",
            "timestamp": datetime.utcnow()
        }
    ]
    await security_logs_collection.insert_many(initial_logs)

    return {"message": "Базу даних успішно оновлено! Додано 20 одиниць обладнання та згенеровано стартові логи."}