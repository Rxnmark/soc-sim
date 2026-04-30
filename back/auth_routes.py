from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from database import get_db
import models
import schemas
import auth_utils
import pyotp

router = APIRouter(prefix="/api/v1/auth", tags=["auth"])

@router.post("/login")
def login(login_data: schemas.UserLogin, db: Session = Depends(get_db)):
    """Authenticate user. Returns token or requires 2FA."""
    user = db.query(models.User).filter(models.User.username == login_data.username).first()
    
    if not user or not auth_utils.verify_password(login_data.password, user.password_hash):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials")
    
    # If 2FA is enabled, signal frontend to request 2FA code
    if user.is_2fa_enabled:
        return {"require_2fa": True, "username": user.username}
    
    # Otherwise, issue token directly
    token = auth_utils.create_access_token({"sub": user.username, "role": user.role})
    return {"access_token": token, "token_type": "bearer", "role": user.role}

@router.post("/setup-2fa", response_model=schemas.TwoFactorSetup)
def setup_2fa(username: str, db: Session = Depends(get_db)):
    """Generate a TOTP secret for the user. Does NOT enable 2FA yet."""
    user = db.query(models.User).filter(models.User.username == username).first()
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    
    secret = pyotp.random_base32()
    user.totp_secret = secret
    db.commit()
    
    return {
        "secret": secret,
        "qr_code_url": auth_utils.get_totp_uri(user.username, secret)
    }

@router.post("/verify-2fa")
def verify_2fa(verify_data: schemas.TwoFactorVerify, db: Session = Depends(get_db)):
    """Verify TOTP code and enable 2FA, issuing a token on success."""
    user = db.query(models.User).filter(models.User.username == verify_data.username).first()
    if not user or not user.totp_secret:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="2FA not set up for this user")
    
    totp = pyotp.TOTP(user.totp_secret)
    if not totp.verify(verify_data.code):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid 2FA code")
    
    user.is_2fa_enabled = True
    db.commit()
    
    token = auth_utils.create_access_token({"sub": user.username, "role": user.role})
    return {"access_token": token, "token_type": "bearer", "role": user.role}

@router.post("/verify-2fa-login")
def verify_2fa_login(verify_data: schemas.TwoFactorVerify, db: Session = Depends(get_db)):
    """Verify TOTP code during login (without enabling 2FA)."""
    user = db.query(models.User).filter(models.User.username == verify_data.username).first()
    if not user or not user.totp_secret:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="2FA not set up for this user")
    
    totp = pyotp.TOTP(user.totp_secret)
    if not totp.verify(verify_data.code):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid 2FA code")
    
    token = auth_utils.create_access_token({"sub": user.username, "role": user.role})
    return {"access_token": token, "token_type": "bearer", "role": user.role}

@router.get("/me", response_model=schemas.UserInfo)
def get_me(current: dict = Depends(auth_utils.get_current_user)):
    """Get current user info."""
    user = current["user"]
    return {
        "username": user.username,
        "role": user.role,
        "is_2fa_enabled": user.is_2fa_enabled
    }

@router.post("/logout")
def logout():
    """Client-side logout. JWT is stateless, so just acknowledge."""
    return {"detail": "Logged out successfully"}