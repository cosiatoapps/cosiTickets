import os
import re
from datetime import datetime, timedelta
from typing import Optional
from passlib.context import CryptContext
from jose import jwt
from fastapi import HTTPException, status
from sqlalchemy.orm import Session
from app.models import SecurityPolicy, UserPasswordHistory

pwd_context = CryptContext(schemes=["argon2"], deprecated="auto")

SECRET_KEY = os.getenv("SECRET_KEY", "clave_secreta_super_segura_para_el_mvp_local_2026_jwt")
ALGORITHM = os.getenv("ALGORITHM", "HS256")

# Asegurar conversión explícita a entero (int)
ACCESS_TOKEN_EXPIRE_MINUTES = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", 60))

def hash_password(password: str) -> str:
    return pwd_context.hash(password)

def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)

def validate_password_against_policy(password: str, db: Session, user_id: Optional[str] = None):
    policy = db.query(SecurityPolicy).filter(SecurityPolicy.policy_scope == "GLOBAL").first()
    if not policy:
        return

    if len(password) < policy.min_length or len(password) > policy.max_length:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"La contraseña debe tener entre {policy.min_length} y {policy.max_length} caracteres."
        )

    if policy.require_uppercase and not re.search(r"[A-Z]", password):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Debe contener al menos una mayúscula.")
    if policy.require_lowercase and not re.search(r"[a-z]", password):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Debe contener al menos una minúscula.")
    if policy.require_numbers and not re.search(r"\d", password):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Debe contener al menos un número.")
    if policy.require_special_chars:
        specials = re.findall(r"[^A-Za-z0-9]", password)
        if len(specials) < policy.min_special_chars:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST, 
                detail=f"Debe contener al menos {policy.min_special_chars} carácter(es) especial(es)."
            )

    if user_id and policy.password_history_limit > 0:
        history = (
            db.query(UserPasswordHistory)
            .filter(UserPasswordHistory.user_id == user_id)
            .order_by(UserPasswordHistory.created_at.desc())
            .limit(policy.password_history_limit)
            .all()
        )
        for entry in history:
            if verify_password(password, entry.password_hash):
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"No puedes reutilizar ninguna de tus últimas {policy.password_history_limit} contraseñas."
                )

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        # Cast seguro a int
        expire = datetime.utcnow() + timedelta(minutes=int(ACCESS_TOKEN_EXPIRE_MINUTES))
        
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)