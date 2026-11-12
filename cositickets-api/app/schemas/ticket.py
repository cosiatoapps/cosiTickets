from pydantic import BaseModel, EmailStr, field_validator, model_validator
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
    payment_status: str = "RESERVED"  # 'AVAILABLE', 'RESERVED', 'PAID'
    amount_paid: Optional[float] = 0.0
    payment_method_code: Optional[str] = None
    notes: Optional[str] = None
    organizer_id: Optional[UUID] = None

    @field_validator("customer_name", "customer_email", "customer_phone", "payment_method_code", "notes", mode="before")
    @classmethod
    def empty_str_to_none(cls, v):
        if isinstance(v, str) and not v.strip():
            return None
        return v

    @field_validator("amount_paid", mode="before")
    @classmethod
    def default_amount_if_empty(cls, v):
        if v is None or (isinstance(v, str) and not v.strip()):
            return 0.0
        return float(v)

    @model_validator(mode="after")
    def validate_payment_rules(self):
        monto = self.amount_paid or 0.0
        # payment_method_code es opcional si payment_status == "RESERVED" y amount_paid == 0.0 (o si se libera a AVAILABLE)
        if self.payment_status == "AVAILABLE":
            return self
        if self.payment_status == "RESERVED" and monto == 0.0:
            return self
        if not self.payment_method_code:
            raise ValueError("Debes seleccionar una forma de pago cuando registras un abono mayor a 0 o el boleto pasa a PAGADO.")
        return self


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