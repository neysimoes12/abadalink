"""
JWT Authentication Service for AbadáLink
Handles token generation, validation, and user authentication
"""
import os
import secrets
import uuid
from datetime import datetime, timedelta
from typing import Optional
from jose import JWTError, jwt
from pydantic import BaseModel
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer

# Configuration
SECRET_KEY = os.getenv("JWT_SECRET", secrets.token_urlsafe(32))
ALGORITHM = "HS256"

ACCESS_TOKEN_EXPIRE_MINUTES = int(os.getenv("JWT_EXPIRE_MINUTES", "60"))
REFRESH_TOKEN_EXPIRE_DAYS = int(os.getenv("JWT_REFRESH_DAYS", "7"))

# OAuth2 scheme for token extraction
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="auth/token", auto_error=False)


class TokenData(BaseModel):
    user_id: str
    email: str
    is_admin: bool = False
    exp: datetime


class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    expires_in: int


def create_access_token(user_id: str, email: str, is_admin: bool = False) -> str:
    """Create JWT access token"""
    expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode = {
        "sub": str(user_id),
        "email": email,
        "is_admin": is_admin,
        "exp": expire,
        "type": "access"
    }
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)


def create_refresh_token(user_id: str) -> str:
    """Create JWT refresh token (longer lived)"""
    expire = datetime.utcnow() + timedelta(days=REFRESH_TOKEN_EXPIRE_DAYS)
    to_encode = {
        "sub": str(user_id),
        "exp": expire,
        "type": "refresh"
    }
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)


def create_tokens(user_id: str, email: str, is_admin: bool = False) -> TokenResponse:
    """Create both access and refresh tokens"""
    access_token = create_access_token(user_id, email, is_admin)
    refresh_token = create_refresh_token(user_id)
    
    return TokenResponse(
        access_token=access_token,
        refresh_token=refresh_token,
        expires_in=ACCESS_TOKEN_EXPIRE_MINUTES * 60
    )


def decode_token(token: str) -> Optional[dict]:
    """Decode and validate JWT token"""
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        return payload
    except JWTError:
        return None


def get_current_user_id(token: str = Depends(oauth2_scheme)) -> str:
    """Extract user ID from token - raises exception if invalid"""
    if not token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token não fornecido",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    payload = decode_token(token)
    if not payload:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token inválido ou expirado",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    user_id = payload.get("sub")
    if not user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token inválido",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    return user_id


def get_optional_user_id(token: str = Depends(oauth2_scheme)) -> Optional[str]:
    """Extract user ID from token - returns None if no token"""
    if not token:
        return None
    
    payload = decode_token(token)
    if not payload:
        return None
    
    return payload.get("sub")


def get_current_admin_from_token(token: str = Depends(oauth2_scheme)) -> str:
    """Extract admin user ID from token - raises exception if not admin"""
    if not token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Autenticação necessária",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    payload = decode_token(token)
    if not payload:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token inválido ou expirado",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    if not payload.get("is_admin", False):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Acesso admin necessário"
        )
    
    return payload.get("sub")


def validate_cpf(cpf: str) -> bool:
    """
    Validate Brazilian CPF number
    Returns True if valid, False otherwise
    """
    # Remove non-digits
    cpf = ''.join(filter(str.isdigit, cpf))
    
    # Must have 11 digits
    if len(cpf) != 11:
        return False
    
    # Check for known invalid patterns
    if cpf == cpf[0] * 11 and cpf != "00000000000":
        return False
    
    # Validate first check digit
    sum1 = sum(int(cpf[i]) * (10 - i) for i in range(9))
    digit1 = (sum1 * 10 % 11) % 10
    if digit1 != int(cpf[9]):
        return False
    
    # Validate second check digit
    sum2 = sum(int(cpf[i]) * (11 - i) for i in range(10))
    digit2 = (sum2 * 10 % 11) % 10
    if digit2 != int(cpf[10]):
        return False
    
    return True


def format_cpf(cpf: str) -> str:
    """Format CPF as XXX.XXX.XXX-XX"""
    cpf = ''.join(filter(str.isdigit, cpf))
    if len(cpf) == 11:
        return f"{cpf[:3]}.{cpf[3:6]}.{cpf[6:9]}-{cpf[9:]}"
    return cpf

from dependencies import get_db

def get_current_social_user(
    current_user_id: str = Depends(get_current_user_id),
    db: "Session" = Depends(get_db)
) -> "User":
    """
    Dependency to get current user ONLY if they are eligible for Social Layer.
    Requirements:
    1. KYC Verified
    2. Commercial Activity (Has Listing OR Has Proposal)
    """
    from database_models import User, AbadaListing, SwapProposal
    
    user = db.get(User, uuid.UUID(current_user_id))
    if not user:
        raise HTTPException(status_code=401, detail="User not found")
        
    # 1. KYC Check
    if not user.is_verified or user.kyc_status != "VERIFIED":
        raise HTTPException(
            status_code=403, 
            detail="SOCIAL_LOCKED_KYC: Realize a verificação de identidade para acessar"
        )
        
    # 2. Commercial Activity Check
    # Has listings?
    has_listings = db.query(AbadaListing).filter(AbadaListing.seller_id == user.id).count() > 0
    
    # Has proposals (sent or received)?
    has_proposals = db.query(SwapProposal).filter(
        (SwapProposal.proposer_id == user.id) | (SwapProposal.owner_id == user.id)
    ).count() > 0
    
    if not (has_listings or has_proposals):
        raise HTTPException(
            status_code=403,
            detail="SOCIAL_LOCKED_ACTIVITY: Anuncie um abadá ou faça uma proposta para interagir!"
        )
        
    return user


def get_simple_user(current_user_id: str = Depends(get_current_user_id), db: "Session" = Depends(get_db)) -> "User":
    from database_models import User
    u = db.get(User, uuid.UUID(current_user_id))
    if not u:
        raise HTTPException(status_code=401, detail='User not found')
    return u
