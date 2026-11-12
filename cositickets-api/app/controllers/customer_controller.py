from datetime import datetime, timedelta, timezone
from uuid import UUID
from fastapi import HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import select, and_

from app.models.domain import Raffle, Ticket, TicketNumber, CustomerPurchase, Notification, User
from app.schemas.ticket import PublicReserveRequest, SwapTicketRequest
from app.core.security import hash_password


class CustomerController:

    @staticmethod
    def get_public_raffles(db: Session) -> list[dict]:
        raffles = db.query(Raffle).filter(Raffle.status == "ACTIVE").order_by(Raffle.draw_date.asc()).all()
        results = []
        for r in raffles:
            total_t = db.query(Ticket).filter(Ticket.raffle_id == r.id).count()
            paid_t = db.query(Ticket).filter(and_(Ticket.raffle_id == r.id, Ticket.status == "PAID")).count()
            reserved_t = db.query(Ticket).filter(and_(Ticket.raffle_id == r.id, Ticket.status == "RESERVED")).count()
            avail_t = total_t - (paid_t + reserved_t)

            results.append({
                "id": str(r.id),
                "title": r.title,
                "description": r.description,
                "prize_name": r.prize_name,
                "ticket_price": float(r.ticket_price),
                "draw_date": r.draw_date.isoformat(),
                "numbers_per_ticket": r.numbers_per_ticket,
                "metrics": {
                    "total": total_t,
                    "paid": paid_t,
                    "reserved": reserved_t,
                    "available": avail_t,
                    "percentage_sold": round(((paid_t + reserved_t) / total_t * 100), 1) if total_t > 0 else 0,
                },
            })
        return results

    @staticmethod
    def reserve_public_ticket(payload: PublicReserveRequest, db: Session) -> dict:
        ticket = db.execute(
            select(Ticket).where(Ticket.id == payload.ticket_id).with_for_update()
        ).scalar_one_or_none()

        if not ticket:
            raise HTTPException(status_code=404, detail="Boleto no encontrado.")
        if ticket.status != "AVAILABLE":
            raise HTTPException(status_code=409, detail="Este número ya fue apartado o vendido.")

        raffle = db.query(Raffle).filter(Raffle.id == payload.raffle_id).first()
        if not raffle or raffle.status != "ACTIVE":
            raise HTTPException(status_code=400, detail="La rifa no está disponible.")

        email_clean = payload.customer_email.strip().lower()
        customer = db.query(User).filter(User.email == email_clean).first()
        if not customer:
            customer = User(
                name=payload.customer_name.strip(),
                email=email_clean,
                phone=payload.customer_phone.strip(),
                password_hash=hash_password("Cliente@2026!"),
                role="CUSTOMER",
                is_active=True,
            )
            db.add(customer)
            db.flush()
        else:
            customer.name = payload.customer_name.strip()
            customer.phone = payload.customer_phone.strip()

        ticket.status = "RESERVED"
        purchase = CustomerPurchase(
            customer_id=customer.id,
            raffle_id=raffle.id,
            ticket_id=ticket.id,
            payment_status="PENDING",
            total_amount=raffle.ticket_price,
            balance_paid=0.0,
        )
        db.add(purchase)

        nums = [n.number_value for n in db.query(TicketNumber).filter(TicketNumber.ticket_id == ticket.id).all()]
        nums_str = ", ".join(nums)

        db.add(Notification(
            user_id=raffle.organizer_id,
            title=f"Nuevo apartado: [{nums_str}]",
            message=f"{customer.name} ({customer.phone}) apartó el boleto {ticket.ticket_code} [{nums_str}] en '{raffle.title}'.",
            notification_type="RESERVATION",
            metadata_info={"raffle_id": str(raffle.id), "ticket_id": str(ticket.id), "numbers": nums},
        ))

        db.commit()
        return {"message": "Boleto apartado exitosamente.", "customer_id": str(customer.id), "numbers": nums}

    @staticmethod
    def swap_ticket(payload: SwapTicketRequest, db: Session) -> dict:
        purchase = db.query(CustomerPurchase).filter(
            and_(
                CustomerPurchase.ticket_id == payload.current_ticket_id,
                CustomerPurchase.customer_id == payload.customer_id,
            )
        ).first()

        if not purchase:
            raise HTTPException(status_code=404, detail="No se encontró la compra asociada a tu usuario.")
        if purchase.payment_status == "PAID":
            raise HTTPException(status_code=400, detail="Los boletos pagados no pueden cambiarse desde el portal.")

        raffle = db.query(Raffle).filter(Raffle.id == purchase.raffle_id).first()
        now_utc = datetime.now(timezone.utc)
        draw_utc = raffle.draw_date if raffle.draw_date.tzinfo else raffle.draw_date.replace(tzinfo=timezone.utc)

        if (draw_utc - now_utc) < timedelta(hours=24):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="El cambio de número solo está permitido hasta 24 horas antes del sorteo.",
            )

        old_ticket = db.execute(select(Ticket).where(Ticket.id == payload.current_ticket_id).with_for_update()).scalar_one_or_none()
        new_ticket = db.execute(select(Ticket).where(Ticket.id == payload.new_ticket_id).with_for_update()).scalar_one_or_none()

        if not new_ticket or new_ticket.status != "AVAILABLE" or new_ticket.raffle_id != raffle.id:
            raise HTTPException(status_code=409, detail="El nuevo número seleccionado ya no está disponible.")

        old_nums = [n.number_value for n in db.query(TicketNumber).filter(TicketNumber.ticket_id == old_ticket.id).all()]
        new_nums = [n.number_value for n in db.query(TicketNumber).filter(TicketNumber.ticket_id == new_ticket.id).all()]

        old_ticket.status = "AVAILABLE"
        new_ticket.status = "RESERVED"
        purchase.ticket_id = new_ticket.id

        customer = db.query(User).filter(User.id == payload.customer_id).first()
        db.add(Notification(
            user_id=raffle.organizer_id,
            title=f"Cambio de número en '{raffle.title}'",
            message=f"El cliente {customer.name} cambió [{', '.join(old_nums)}] por [{', '.join(new_nums)}].",
            notification_type="NUMBER_CHANGE",
            metadata_info={"raffle_id": str(raffle.id), "old_numbers": old_nums, "new_numbers": new_nums},
        ))

        db.commit()
        return {"message": "Cambio de número realizado con éxito.", "new_numbers": new_nums}