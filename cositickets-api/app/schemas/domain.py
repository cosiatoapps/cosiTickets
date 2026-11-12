from pydantic import BaseModel, EmailStr
from typing import Optional, List
from datetime import datetime
from uuid import UUID

# --- USUARIOS & ORGANIZADORES ---
class UserCreate(BaseModel):
    name: str
    email: EmailStr
    phone: Optional[str] = None
    password: str
    role: Optional[str] = "CUSTOMER"

class OrganizerCreate(BaseModel):
    name: str
    email: EmailStr
    phone: Optional[str] = None
    password: str
    max_total_raffles: int = 10
    max_monthly_raffles: int = 5

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class UserResponse(BaseModel):
    id: UUID
    name: str
    email: EmailStr
    role: str
    is_active: bool

    class Config:
        from_attributes = True

# --- POLÍTICAS DE SEGURIDAD ---
class PolicyUpdate(BaseModel):
    min_length: int
    require_uppercase: bool
    require_lowercase: bool
    require_numbers: bool
    require_special_chars: bool
    password_expiration_days: int
    password_history_limit: int

# --- RIFAS & BOLETOS ---
class RaffleCreate(BaseModel):
    title: str
    description: Optional[str] = None
    prize_name: str
    ticket_price: float
    number_range_start: int = 0
    number_range_end: int = 99
    numbers_per_ticket: int = 1
    draw_date: datetime

class RaffleUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    draw_date: Optional[datetime] = None
    reason: str

class TicketResponse(BaseModel):
    id: UUID
    ticket_code: str
    status: str

    class Config:
        from_attributes = True

class GenerateDesignRequest(BaseModel):
    prompt: str
    primary_color: Optional[str] = "#4F46E5"
    secondary_color: Optional[str] = "#06B6D4"

# --- COMPRAS, TICKETS Y ABONOS ---
class ReserveTicketRequest(BaseModel):
    customer_id: UUID

class PaymentRecordRequest(BaseModel):
    amount: float
    payment_method: str = "TRANSFER"
    reference_number: Optional[str] = None
    proof_file_url: Optional[str] = None
    recorded_by: UUID

# --- PORTAL CLIENTE ---
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