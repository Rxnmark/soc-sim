from fastapi import FastAPI, Depends
from sqlalchemy.orm import Session
from database import get_db, security_logs_collection
from simulation_endpoints import simulation_manager
import models
import auth_utils

# Default user seeds (username -> {role, password})
DEFAULT_USERS = [
    {"username": "ceo", "role": "CEO", "password": "password123"},
    {"username": "ciso", "role": "CISO", "password": "password123"},
    {"username": "pm", "role": "PM", "password": "password123"},
]


def setup_reset(app: FastAPI, dependencies=None):
    if dependencies is None:
        dependencies = []

    @app.post("/api/v1/reset", dependencies=dependencies)
    async def reset_database(db: Session = Depends(get_db)):
        # Stop simulation to prevent background queries during reset
        simulation_manager.stop()
        
        # Safely delete data instead of drop_all to avoid deadlocks with active sessions
        db.query(models.RiskAssessment).delete()
        db.query(models.ThreatArchive).delete()
        db.query(models.BusinessRisk).delete()
        db.query(models.Threat).delete()
        # Avoid self-referencing foreign key errors by clearing parent_id first
        db.query(models.Equipment).update({"parent_id": None})
        db.query(models.Equipment).delete()
        db.commit()
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
        for i, eq in enumerate(equipment_data, start=1):
            eq["id"] = i
            new_eq = models.Equipment(**eq)
            db.add(new_eq)
            eq_objects.append(new_eq)
        db.commit()
        
        # Seed default users
        db.query(models.User).delete()
        for user_data in DEFAULT_USERS:
            user = models.User(
                username=user_data["username"],
                password_hash=auth_utils.hash_password(user_data["password"]),
                role=user_data["role"],
                is_2fa_enabled=False
            )
            db.add(user)
        db.commit()
        
        await security_logs_collection.delete_many({})
        await simulation_manager.start()
        return {"message": "Database reset! Simulation game started. Attacks will begin shortly."}
    return reset_database