from uuid import UUID
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.schemas.domain import RaffleCreate, RaffleUpdate, GenerateDesignRequest
from app.schemas.ticket import TicketManagementUpdate
from app.controllers.organizer_controller import OrganizerController

router = APIRouter()


@router.get("/my-raffles/{organizer_id}")
def get_my_raffles(organizer_id: UUID, db: Session = Depends(get_db)):
    return OrganizerController.get_my_raffles(organizer_id, db)


@router.post("/raffles")
def create_raffle(payload: RaffleCreate, organizer_id: UUID, db: Session = Depends(get_db)):
    return OrganizerController.create_raffle(payload, organizer_id, db)


@router.patch("/raffles/{raffle_id}")
def update_raffle(raffle_id: UUID, payload: RaffleUpdate, actor_id: UUID, db: Session = Depends(get_db)):
    return OrganizerController.update_raffle(raffle_id, payload, actor_id, db)


@router.post("/raffles/{raffle_id}/generate-assets")
def generate_assets(raffle_id: UUID, payload: GenerateDesignRequest, db: Session = Depends(get_db)):
    return OrganizerController.generate_assets(raffle_id, payload, db)


@router.patch("/tickets/{ticket_id}")
def update_ticket(ticket_id: UUID, payload: TicketManagementUpdate, db: Session = Depends(get_db)):
    return OrganizerController.update_ticket_management(ticket_id, payload, db)


@router.get("/notifications/{organizer_id}")
def get_notifications(organizer_id: UUID, db: Session = Depends(get_db)):
    return OrganizerController.get_notifications(organizer_id, db)


@router.patch("/notifications/{notification_id}/read")
def mark_notification_read(notification_id: UUID, db: Session = Depends(get_db)):
    return OrganizerController.mark_notification_read(notification_id, db)