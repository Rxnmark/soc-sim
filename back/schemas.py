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
    source_ip: str = ""

    class Config:
        from_attributes = True

class SecurityLog(BaseModel):
    event_type: str
    description: str
    source_ip: str

class FixRequest(BaseModel):
    source_ip: str
    target_equipment_id: int | None = None

class SimulationStatus(BaseModel):
    is_running: bool
    phase: str
    financial_exposure: float
    active_attacks_count: int
    is_paused: bool | None = None
    speed_multiplier: float | None = None

class FixResponse(BaseModel):
    status: str
    attack_type: str | None = None

# --- Схеми автентифікації (JWT + 2FA) ---
class UserLogin(BaseModel):
    username: str
    password: str

class Token(BaseModel):
    access_token: str
    token_type: str
    role: str

class TwoFactorSetup(BaseModel):
    secret: str
    qr_code_url: str

class TwoFactorVerify(BaseModel):
    username: str
    code: str

class UserInfo(BaseModel):
    username: str
    role: str
    is_2fa_enabled: bool
