import uuid
from datetime import datetime
from sqlalchemy import (
    Column, String, Boolean, Integer, DateTime, ForeignKey, 
    Numeric, Enum as SQLEnum, Text
)
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import relationship
from app.database import Base

class SecurityPolicy(Base):
    __tablename__ = "security_policies"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    policy_scope = Column(String(30), unique=True, nullable=False, default="GLOBAL")
    min_length = Column(Integer, default=12)
    max_length = Column(Integer, default=128)
    require_uppercase = Column(Boolean, default=True)
    require_lowercase = Column(Boolean, default=True)
    require_numbers = Column(Boolean, default=True)
    require_special_chars = Column(Boolean, default=True)
    min_special_chars = Column(Integer, default=1)
    password_expiration_days = Column(Integer, default=90)
    password_history_limit = Column(Integer, default=5)
    max_failed_attempts = Column(Integer, default=5)
    lockout_duration_minutes = Column(Integer, default=30)
    mfa_required = Column(Boolean, default=False)
    updated_by = Column(UUID(as_uuid=True), nullable=True)
    updated_at = Column(DateTime(timezone=True), default=datetime.utcnow)

class User(Base):
    __tablename__ = "users"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String(120), nullable=False)
    email = Column(String(180), unique=True, index=True, nullable=False)
    phone = Column(String(30), nullable=True)
    password_hash = Column(String(255), nullable=False)
    role = Column(SQLEnum("ADMIN", "ORGANIZER", "CUSTOMER", name="user_role_enum"), default="CUSTOMER")
    password_changed_at = Column(DateTime(timezone=True), default=datetime.utcnow)
    must_change_password = Column(Boolean, default=False)
    failed_login_attempts = Column(Integer, default=0)
    lockout_until = Column(DateTime(timezone=True), nullable=True)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), default=datetime.utcnow)
    updated_at = Column(DateTime(timezone=True), default=datetime.utcnow)

    password_history = relationship("UserPasswordHistory", back_populates="user")
    raffles = relationship("Raffle", back_populates="organizer")
    limits = relationship("OrganizerLimit", back_populates="organizer", uselist=False)

class UserPasswordHistory(Base):
    __tablename__ = "user_password_history"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    password_hash = Column(String(255), nullable=False)
    created_at = Column(DateTime(timezone=True), default=datetime.utcnow)

    user = relationship("User", back_populates="password_history")

class OrganizerLimit(Base):
    __tablename__ = "organizer_limits"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    organizer_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), unique=True, nullable=False)
    max_total_raffles = Column(Integer, default=10)
    max_monthly_raffles = Column(Integer, default=5)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), default=datetime.utcnow)
    updated_at = Column(DateTime(timezone=True), default=datetime.utcnow)

    organizer = relationship("User", back_populates="limits")

class Raffle(Base):
    __tablename__ = "raffles"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    organizer_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    title = Column(String(180), nullable=False)
    description = Column(Text, nullable=True)
    prize_name = Column(String(150), nullable=False)
    prize_images = Column(JSONB, default=list)
    number_range_start = Column(Integer, default=0)
    number_range_end = Column(Integer, default=99)
    numbers_per_ticket = Column(Integer, default=1)
    ticket_price = Column(Numeric(12, 2), nullable=False)
    draw_date = Column(DateTime(timezone=True), nullable=False)
    status = Column(SQLEnum("DRAFT", "ACTIVE", "PAUSED", "COMPLETED", "CANCELLED", name="raffle_status_enum"), default="ACTIVE")
    winning_number = Column(String(20), nullable=True)
    created_at = Column(DateTime(timezone=True), default=datetime.utcnow)
    updated_at = Column(DateTime(timezone=True), default=datetime.utcnow)

    organizer = relationship("User", back_populates="raffles")
    tickets = relationship("Ticket", back_populates="raffle", cascade="all, delete-orphan")
    design = relationship("RaffleDesign", back_populates="raffle", uselist=False, cascade="all, delete-orphan")

class RaffleDesign(Base):
    __tablename__ = "raffle_designs"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    raffle_id = Column(UUID(as_uuid=True), ForeignKey("raffles.id", ondelete="CASCADE"), unique=True, nullable=False)
    primary_color = Column(String(10), default="#4F46E5")
    secondary_color = Column(String(10), default="#06B6D4")
    background_image_url = Column(Text, nullable=True)
    ticket_template_url = Column(Text, nullable=True)
    ai_prompt_used = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), default=datetime.utcnow)
    updated_at = Column(DateTime(timezone=True), default=datetime.utcnow)

    raffle = relationship("Raffle", back_populates="design")

class Ticket(Base):
    __tablename__ = "tickets"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    raffle_id = Column(UUID(as_uuid=True), ForeignKey("raffles.id", ondelete="CASCADE"), nullable=False)
    ticket_code = Column(String(30), nullable=False)
    status = Column(SQLEnum("AVAILABLE", "RESERVED", "PAID", name="ticket_status_enum"), default="AVAILABLE")
    created_at = Column(DateTime(timezone=True), default=datetime.utcnow)

    raffle = relationship("Raffle", back_populates="tickets")
    numbers = relationship("TicketNumber", back_populates="ticket", cascade="all, delete-orphan")
    purchases = relationship("CustomerPurchase", back_populates="ticket")

class TicketNumber(Base):
    __tablename__ = "ticket_numbers"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    ticket_id = Column(UUID(as_uuid=True), ForeignKey("tickets.id", ondelete="CASCADE"), nullable=False)
    raffle_id = Column(UUID(as_uuid=True), ForeignKey("raffles.id", ondelete="CASCADE"), nullable=False)
    number_value = Column(String(10), nullable=False)

    ticket = relationship("Ticket", back_populates="numbers")

class CustomerPurchase(Base):
    __tablename__ = "customer_purchases"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    customer_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    raffle_id = Column(UUID(as_uuid=True), ForeignKey("raffles.id"), nullable=False)
    ticket_id = Column(UUID(as_uuid=True), ForeignKey("tickets.id"), nullable=False)
    payment_status = Column(SQLEnum("PENDING", "PARTIAL_PAYMENT", "PAID", "UNPAID", name="purchase_payment_status_enum"), default="PENDING")
    total_amount = Column(Numeric(12, 2), nullable=False)
    balance_paid = Column(Numeric(12, 2), default=0.00)
    created_at = Column(DateTime(timezone=True), default=datetime.utcnow)
    updated_at = Column(DateTime(timezone=True), default=datetime.utcnow)

    ticket = relationship("Ticket", back_populates="purchases")
    payments = relationship("PaymentTransaction", back_populates="purchase", cascade="all, delete-orphan")

class PaymentTransaction(Base):
    __tablename__ = "payment_transactions"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    purchase_id = Column(UUID(as_uuid=True), ForeignKey("customer_purchases.id", ondelete="CASCADE"), nullable=False)
    amount = Column(Numeric(12, 2), nullable=False)
    payment_method = Column(String(50), default="TRANSFER")
    reference_number = Column(String(100), nullable=True)
    proof_file_url = Column(Text, nullable=True)
    recorded_by = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    created_at = Column(DateTime(timezone=True), default=datetime.utcnow)
    notes = Column(Text, nullable=True)
    
    purchase = relationship("CustomerPurchase", back_populates="payments")

class AuditLog(Base):
    __tablename__ = "audit_logs"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    entity_name = Column(String(60), nullable=False)
    entity_id = Column(UUID(as_uuid=True), nullable=False)
    actor_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    action = Column(SQLEnum("CREATE", "UPDATE", "DELETE", name="audit_action_enum"), nullable=False)
    old_values = Column(JSONB, nullable=True)
    new_values = Column(JSONB, nullable=True)
    ip_address = Column(String(50), nullable=True)
    user_agent = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), default=datetime.utcnow)

class PaymentMethod(Base):
    __tablename__ = "payment_methods"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    code = Column(String(50), unique=True, nullable=False) # EFECTIVO, TRANSFERENCIA, NEQUI, DAVIPLATA
    name = Column(String(100), nullable=False)
    description = Column(String(255), nullable=True)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), default=datetime.utcnow)

class Notification(Base):
    __tablename__ = "notifications"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    title = Column(String(150), nullable=False)
    message = Column(Text, nullable=False)
    notification_type = Column(String(50), default="RESERVATION") # RESERVATION, NUMBER_CHANGE, PAYMENT
    is_read = Column(Boolean, default=False)
    metadata_info = Column(JSONB, nullable=True)
    created_at = Column(DateTime(timezone=True), default=datetime.utcnow)