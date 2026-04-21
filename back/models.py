from sqlalchemy import Column, Integer, String, Boolean, ForeignKey, Float, DateTime
from sqlalchemy.orm import relationship
from database import Base
import datetime

class Equipment(Base):
    __tablename__ = "equipment"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, index=True)
    type = Column(String)
    ip_address = Column(String, unique=True)
    status = Column(String, default="Online")
    parent_id = Column(Integer, ForeignKey("equipment.id"), nullable=True)

    # Relationship for hierarchy
    children = relationship("Equipment", backref="parent", remote_side=[id])

class RiskAssessment(Base):
    __tablename__ = "risk_assessments"
    id = Column(Integer, primary_key=True, index=True)
    equipment_id = Column(Integer, ForeignKey("equipment.id"))
    risk_level = Column(String)   
    description = Column(String)
    is_resolved = Column(Boolean, default=False)

# --- НОВА ТАБЛИЦЯ ДЛЯ RISK MANAGEMENT DASHBOARD ---
class BusinessRisk(Base):
    __tablename__ = "business_risks"
    id = Column(Integer, primary_key=True, index=True)
    title = Column(String, index=True)
    category = Column(String) # Наприклад: "Cyber", "Operational", "Financial"
    probability = Column(Integer) # Від 1 до 5
    impact = Column(Integer) # Від 1 до 5
    status = Column(String, default="Open") # "Open", "Mitigated", "In Progress"

# --- НОВА ТАБЛИЦЯ ДЛЯ THREAT INTELLIGENCE ---
class Threat(Base):
    __tablename__ = "threats"
    id = Column(Integer, primary_key=True, index=True)
    title = Column(String)
    description = Column(String)
    type = Column(String) # Наприклад: "DDoS", "Malware", "Brute-force", "Phishing"
    severity = Column(String) # "Low", "Medium", "High", "Critical"
    category = Column(String, default="Active") # "Warning", "Active", "Critical"
    timestamp = Column(DateTime, default=datetime.datetime.utcnow)
