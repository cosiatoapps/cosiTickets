from pydantic import BaseModel, EmailStr
from typing import Optional, List
from datetime import datetime
from uuid import UUID


class PublicReserveRequest(BaseModel):
    raffle_id: UUID
    ticket_id: UUID
    customer_name: str
    customer_email: EmailStr
    customer_phone: str


class SwapTicketRequest(BaseModel):
    current_ticket_id: UUID
    new_ticket_id: UUID
    customer_id: UUID


class ReserveTicketRequest(BaseModel):
    customer_id: UUID


class TicketManagementUpdate(BaseModel):
    customer_name: Optional[str] = None
    customer_email: Optional[str] = None
    customer_phone: Optional[str] = None
    payment_status: str  # 'AVAILABLE', 'RESERVED', 'PAID'
    amount_paid: float
    payment_method_code: Optional[str] = "CASH"
    notes: Optional[str] = None
    organizer_id: UUID


class PaymentRecordRequest(BaseModel):
    amount: float
    payment_method: str = "TRANSFER"
    reference_number: Optional[str] = None
    proof_file_url: Optional[str] = None
    recorded_by: UUID


class TicketResponse(BaseModel):
    id: UUID
    ticket_code: str
    status: str

    class Config:
        from_attributes = True


class CustomerTicketItem(BaseModel):
    ticket_id: UUID
    ticket_code: str
    numbers: List[str]
    payment_status: str
    balance_paid: float
    total_amount: float
    draw_date: datetime
    raffle_title: str
    winning_number: Optional[str] = None


class CustomerPortalResponse(BaseModel):
    customer_id: UUID
    total_tickets: int
    tickets: List[CustomerTicketItem]