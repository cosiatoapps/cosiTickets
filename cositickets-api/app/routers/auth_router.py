from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.schemas.domain import UserCreate, UserLogin, UserResponse
from app.controllers.auth_controller import AuthController

router = APIRouter()


@router.post("/register", response_model=UserResponse)
def register_user(payload: UserCreate, db: Session = Depends(get_db)):
    return AuthController.register(payload, db)


@router.post("/login")
def login(payload: UserLogin, db: Session = Depends(get_db)):
    return AuthController.login(payload, db)