import jwt
import pyotp
import os
from datetime import datetime, timedelta
from typing import Optional
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.orm import Session
from database import get_db

SECRET_KEY = os.environ.get("SOC_SIMULATOR_SECRET", "soc_simulator_secret_k3y_change_in_prod")
ALGORITHM = "HS256"
TOKEN_EXPIRE_HOURS = 8

pwd_context = None

def get_pwd_context():
    global pwd_context
    if pwd_context is None:
        from passlib.context import CryptContext
        pwd_context = CryptContext(schemes=["argon2"], deprecated="auto")
    return pwd_context

def hash_password(password: str) -> str:
    return get_pwd_context().hash(password)

def verify_password(plain_password: str, hashed_password: str) -> bool:
    return get_pwd_context().verify(plain_password, hashed_password)

def create_access_token(data: dict) -> str:
    to_encode = data.copy()
    expire = datetime.utcnow() + timedelta(hours=TOKEN_EXPIRE_HOURS)
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)

def decode_access_token(token: str) -> Optional[dict]:
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        return payload
    except jwt.ExpiredSignatureError:
        return None
    except jwt.InvalidTokenError:
        return None

def get_totp_uri(username: str, secret: str) -> str:
    return pyotp.totp.TOTP(secret).provisioning_uri(name=username, issuer_name="SOC_Simulator")

# --- FastAPI Security Dependencies ---
security = HTTPBearer(auto_error=False)

def get_current_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security),
    db: Session = Depends(get_db)
) -> dict:
    """Extracts and validates the current user from the Bearer token."""
    from models import User
    
    if credentials is None or not credentials.scheme == "Bearer":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authenticated. Please login to access this resource."
        )
    
    payload = decode_access_token(credentials.credentials)
    if payload is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token."
        )
    
    username: str = payload.get("sub")
    if username is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token payload."
        )
    
    user = db.query(User).filter(User.username == username).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found."
        )
    
    return {"user": user, "role": user.role, "username": user.username}

def require_role(allowed_roles: list[str]):
    """RBAC dependency factory. Raises 403 if the user's role is not in allowed_roles."""
    async def role_checker(current: dict = Depends(get_current_user)):
        if current["role"] not in allowed_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Access denied. Required role: {', '.join(allowed_roles)}"
            )
        return current
    return role_checker