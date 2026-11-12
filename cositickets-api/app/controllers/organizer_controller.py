from datetime import datetime
from uuid import UUID
from fastapi import HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import and_

from app.models import (
    Raffle,
    Ticket,
    TicketNumber,
    CustomerPurchase,
    PaymentTransaction,
    Notification,
    User,
    OrganizerLimit,
    RaffleDesign,
    AuditLog,
)
from app.schemas.domain import RaffleCreate, RaffleUpdate, GenerateDesignRequest
from app.schemas.ticket import TicketManagementUpdate
from app.core.security import hash_password

try:
    from app.agents.ai_design_agent import generate_raffle_assets
except ImportError:
    from app.ai_agent import generate_raffle_assets


class OrganizerController:

    @staticmethod
    def get_my_raffles(organizer_id: UUID, db: Session) -> list[dict]:
        raffles = db.query(Raffle).filter(Raffle.organizer_id == organizer_id).all()
        data = []
        for r in raffles:
            total = db.query(Ticket).filter(Ticket.raffle_id == r.id).count()
            paid = db.query(Ticket).filter(and_(Ticket.raffle_id == r.id, Ticket.status == "PAID")).count()
            reserved = db.query(Ticket).filter(and_(Ticket.raffle_id == r.id, Ticket.status == "RESERVED")).count()
            data.append({
                "id": str(r.id),
                "title": r.title,
                "description": r.description,
                "prize_name": r.prize_name,
                "ticket_price": float(r.ticket_price),
                "numbers_per_ticket": r.numbers_per_ticket,
                "draw_date": r.draw_date.isoformat() if r.draw_date else None,
                "status": r.status.value if hasattr(r.status, "value") else str(r.status),
                "metrics": {
                    "total": total,
                    "paid": paid,
                    "reserved": reserved,
                    "available": total - (paid + reserved),
                },
            })
        return data

    @staticmethod
    def create_raffle(payload: RaffleCreate, organizer_id: UUID, db: Session) -> dict:
        limits = db.query(OrganizerLimit).filter(OrganizerLimit.organizer_id == organizer_id).first()
        if limits:
            total_created = db.query(Raffle).filter(Raffle.organizer_id == organizer_id).count()
            if total_created >= limits.max_total_raffles:
                raise HTTPException(
                    status_code=403,
                    detail=f"Límite total alcanzado ({limits.max_total_raffles} rifas permitidas).",
                )

        raffle = Raffle(
            organizer_id=organizer_id,
            title=payload.title,
            description=payload.description,
            prize_name=payload.prize_name,
            ticket_price=payload.ticket_price,
            number_range_start=payload.number_range_start,
            number_range_end=payload.number_range_end,
            numbers_per_ticket=payload.numbers_per_ticket,
            draw_date=payload.draw_date,
        )
        db.add(raffle)
        db.commit()
        db.refresh(raffle)

        total_nums = (payload.number_range_end - payload.number_range_start) + 1
        tickets_count = total_nums // payload.numbers_per_ticket

        for t_idx in range(tickets_count):
            t_code = f"T-{str(t_idx).zfill(2)}"
            ticket = Ticket(raffle_id=raffle.id, ticket_code=t_code, status="AVAILABLE")
            db.add(ticket)
            db.flush()

            for k in range(payload.numbers_per_ticket):
                val = str(t_idx + (k * tickets_count)).zfill(2)
                db.add(TicketNumber(ticket_id=ticket.id, raffle_id=raffle.id, number_value=val))

        db.add(
            AuditLog(
                entity_name="raffles",
                entity_id=raffle.id,
                actor_id=organizer_id,
                action="CREATE",
                new_values={
                    "title": raffle.title,
                    "ticket_price": float(raffle.ticket_price),
                    "draw_date": raffle.draw_date.isoformat(),
                },
            )
        )
        db.commit()
        return {"message": "Rifa y boletos generados correctamente", "raffle_id": str(raffle.id), "total_tickets": tickets_count}

    @staticmethod
    def update_raffle(raffle_id: UUID, payload: RaffleUpdate, actor_id: UUID, db: Session) -> dict:
        raffle = db.query(Raffle).filter(Raffle.id == raffle_id).first()
        if not raffle:
            raise HTTPException(status_code=404, detail="Rifa no encontrada.")

        old_data = {"draw_date": raffle.draw_date.isoformat(), "title": raffle.title}
        new_data = {"reason": payload.reason}

        if payload.draw_date:
            new_data["draw_date"] = payload.draw_date.isoformat()
            raffle.draw_date = payload.draw_date
        if payload.title:
            new_data["title"] = payload.title
            raffle.title = payload.title

        db.add(
            AuditLog(
                entity_name="raffles",
                entity_id=raffle.id,
                actor_id=actor_id,
                action="UPDATE",
                old_values=old_data,
                new_values=new_data,
            )
        )
        db.commit()
        return {"message": "Rifa actualizada y cambio registrado en auditoría.", "raffle_id": str(raffle.id)}

    @staticmethod
    def generate_assets(raffle_id: UUID, payload: GenerateDesignRequest, db: Session) -> dict:
        raffle = db.query(Raffle).filter(Raffle.id == raffle_id).first()
        if not raffle:
            raise HTTPException(status_code=404, detail="Rifa no encontrada.")

        assets = generate_raffle_assets(payload.prompt, raffle.title)
        design = db.query(RaffleDesign).filter(RaffleDesign.raffle_id == raffle_id).first()
        if not design:
            design = RaffleDesign(raffle_id=raffle_id)
            db.add(design)

        design.primary_color = payload.primary_color
        design.secondary_color = payload.secondary_color
        design.background_image_url = assets.get("background_image_url")
        design.ticket_template_url = assets.get("ticket_template_url")
        design.ai_prompt_used = payload.prompt
        db.commit()
        return {"message": "Activos generados y vinculados al tablero.", "design": assets}

    @staticmethod
    def update_ticket_management(ticket_id: UUID, payload: TicketManagementUpdate, db: Session) -> dict:
        ticket = db.query(Ticket).filter(Ticket.id == ticket_id).first()
        if not ticket:
            raise HTTPException(status_code=404, detail="Boleto no encontrado.")

        raffle = db.query(Raffle).filter(Raffle.id == ticket.raffle_id).first()
        if payload.organizer_id and str(raffle.organizer_id) != str(payload.organizer_id):
            raise HTTPException(status_code=403, detail="No tienes permisos para modificar boletos de esta rifa.")

        purchase = db.query(CustomerPurchase).filter(CustomerPurchase.ticket_id == ticket.id).first()

        # Liberar boleto a Disponible
        if payload.payment_status == "AVAILABLE":
            ticket.status = "AVAILABLE"
            if purchase:
                db.delete(purchase)
            db.commit()
            return {"message": "Boleto liberado a estado disponible."}

        # Crear o actualizar cliente
        email = (payload.customer_email or f"cliente_{ticket.ticket_code.lower()}@cositickets.local").strip().lower()
        customer = db.query(User).filter(User.email == email).first()
        if not customer:
            customer = User(
                name=payload.customer_name or "Cliente Presencial",
                email=email,
                phone=payload.customer_phone,
                password_hash=hash_password("Cliente@2026!"),
                role="CUSTOMER",
                is_active=True,
            )
            db.add(customer)
            db.flush()
        else:
            if payload.customer_name:
                customer.name = payload.customer_name
            if payload.customer_phone:
                customer.phone = payload.customer_phone

        if not purchase:
            purchase = CustomerPurchase(
                customer_id=customer.id,
                raffle_id=raffle.id,
                ticket_id=ticket.id,
                total_amount=raffle.ticket_price,
                balance_paid=0.0,
            )
            db.add(purchase)
            db.flush()
        else:
            purchase.customer_id = customer.id

        amount = float(payload.amount_paid or 0.0)
        ticket.status = payload.payment_status
        purchase.balance_paid = amount

        if payload.payment_status == "PAID" or amount >= float(purchase.total_amount):
            purchase.payment_status = "PAID"
        elif amount > 0:
            purchase.payment_status = "PARTIAL_PAYMENT"
        else:
            purchase.payment_status = "PENDING"

        # Solo registra transacción financiera si hubo abono/pago > 0
        if amount > 0:
            db.add(
                PaymentTransaction(
                    purchase_id=purchase.id,
                    amount=amount,
                    payment_method=payload.payment_method_code or "CASH",
                    notes=payload.notes,
                    recorded_by=payload.organizer_id or raffle.organizer_id,
                )
            )

        db.commit()
        return {"message": "Boleto, cliente y estado de pago actualizados correctamente."}

    @staticmethod
    def get_notifications(organizer_id: UUID, db: Session) -> list[dict]:
        items = (
            db.query(Notification)
            .filter(Notification.user_id == organizer_id)
            .order_by(Notification.created_at.desc())
            .limit(30)
            .all()
        )
        return [
            {
                "id": str(n.id),
                "title": n.title,
                "message": n.message,
                "notification_type": n.notification_type,
                "is_read": n.is_read,
                "created_at": n.created_at.isoformat() if n.created_at else None,
            }
            for n in items
        ]

    @staticmethod
    def mark_notification_read(notification_id: UUID, db: Session) -> dict:
        notif = db.query(Notification).filter(Notification.id == notification_id).first()
        if notif:
            notif.is_read = True
            db.commit()
        return {"status": "ok"}