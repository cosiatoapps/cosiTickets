from uuid import UUID
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.schemas.domain import OrganizerCreate, PolicyUpdate, UserResponse
from app.controllers.admin_controller import AdminController

router = APIRouter()


@router.get("/security-policies")
def get_security_policies(db: Session = Depends(get_db)):
    return AdminController.get_security_policies(db)


@router.put("/security-policies")
def update_security_policies(payload: PolicyUpdate, db: Session = Depends(get_db)):
    return AdminController.update_security_policies(payload, db)


@router.get("/users")
def list_users(db: Session = Depends(get_db)):
    return AdminController.list_users(db)


@router.patch("/users/{user_id}/status")
def toggle_user_status(user_id: UUID, is_active: bool, db: Session = Depends(get_db)):
    return AdminController.toggle_user_status(user_id, is_active, db)


@router.post("/organizers", response_model=UserResponse)
def create_organizer(payload: OrganizerCreate, db: Session = Depends(get_db)):
    return AdminController.create_organizer(payload, db)


@router.get("/organizers-raffles")
def list_organizers_raffles(db: Session = Depends(get_db)):
    return AdminController.list_organizers_raffles(db)


@router.get("/audit-logs")
def list_audit_logs(db: Session = Depends(get_db)):
    return AdminController.list_audit_logs(db)