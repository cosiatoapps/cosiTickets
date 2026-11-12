from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.controllers.system_controller import SystemController

router = APIRouter()


@router.get("/health", tags=["Sistema"])
def health_check():
    return {"status": "healthy", "architecture": "MVC", "version": "2.1.0"}


@router.get("/payment-methods", tags=["Sistema"])
def list_payment_methods(db: Session = Depends(get_db)):
    return SystemController.get_active_payment_methods(db)


@router.get("/cron/daily-summary", tags=["Sistema"])
def run_daily_summary(db: Session = Depends(get_db)):
    return SystemController.generate_daily_summary(db)