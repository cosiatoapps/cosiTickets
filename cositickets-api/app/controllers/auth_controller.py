from fastapi import HTTPException
from sqlalchemy.orm import Session

from app.models import User, UserPasswordHistory
from app.schemas.domain import UserCreate, UserLogin
from app.core.security import (
    hash_password,
    verify_password,
    validate_password_against_policy,
    create_access_token,
)


class AuthController:

    @staticmethod
    def register(payload: UserCreate, db: Session) -> User:
        if db.query(User).filter(User.email == payload.email).first():
            raise HTTPException(status_code=400, detail="El correo ya está registrado.")

        validate_password_against_policy(payload.password, db)
        hashed_pwd = hash_password(payload.password)

        user = User(
            name=payload.name,
            email=payload.email,
            phone=payload.phone,
            password_hash=hashed_pwd,
            role=payload.role or "CUSTOMER",
        )
        db.add(user)
        db.commit()
        db.refresh(user)

        db.add(UserPasswordHistory(user_id=user.id, password_hash=hashed_pwd))
        db.commit()
        return user

    @staticmethod
    def login(payload: UserLogin, db: Session) -> dict:
        user = db.query(User).filter(User.email == payload.email).first()
        if not user or not verify_password(payload.password, user.password_hash):
            raise HTTPException(status_code=401, detail="Credenciales incorrectas.")
        if not user.is_active:
            raise HTTPException(status_code=403, detail="Usuario inactivo o suspendido.")

        role_str = user.role.value if hasattr(user.role, "value") else str(user.role)
        token = create_access_token({"sub": str(user.id), "role": role_str})
        return {
            "access_token": token,
            "token_type": "bearer",
            "role": role_str,
            "user_id": str(user.id),
        }