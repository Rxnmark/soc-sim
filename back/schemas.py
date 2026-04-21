from datetime import datetime
from pydantic import BaseModel

class ThreatResponse(BaseModel):
    id: int
    title: str
    description: str
    type: str
    severity: str
    category: str
    timestamp: datetime

    class Config:
        from_attributes = True

class SecurityLog(BaseModel):
    event_type: str
    description: str
    source_ip: str

class FixRequest(BaseModel):
    source_ip: str

class SimulationStatus(BaseModel):
    is_running: bool
    phase: str
    financial_exposure: float
    active_attacks_count: int

class FixResponse(BaseModel):
    status: str
    attack_type: str | None = None
