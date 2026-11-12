from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from uuid import UUID

from app.core.database import get_db
from app.schemas.ticket import PublicReserveRequest, SwapTicketRequest
from app.controllers.customer_controller import CustomerController

router = APIRouter()

@router.get("/public/raffles")
def list_public_raffles(db: Session = Depends(get_db)):
    return CustomerController.get_public_raffles(db)

@router.post("/public/tickets/reserve")
def reserve_ticket(payload: PublicReserveRequest, db: Session = Depends(get_db)):
    return CustomerController.reserve_public_ticket(payload, db)

@router.post("/customer/tickets/swap")
def swap_ticket(payload: SwapTicketRequest, db: Session = Depends(get_db)):
    return CustomerController.swap_ticket(payload, db)

@router.get("/portal/my-tickets/{customer_id}")
def my_tickets(customer_id: UUID, db: Session = Depends(get_db)):
    return CustomerController.get_customer_tickets(customer_id, db)

@router.get("/raffles/{raffle_id}/board")
def get_board(raffle_id: UUID, db: Session = Depends(get_db)):
    return CustomerController.get_raffle_board(raffle_id, db)