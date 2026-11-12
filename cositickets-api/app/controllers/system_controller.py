from datetime import datetime, timezone
from sqlalchemy.orm import Session
from sqlalchemy import and_

from app.models.domain import PaymentMethod, Raffle, Ticket


class SystemController:

    @staticmethod
    def get_active_payment_methods(db: Session) -> list[dict]:
        methods = db.query(PaymentMethod).filter(PaymentMethod.is_active == True).all()
        return [
            {
                "id": str(m.id),
                "code": m.code,
                "name": m.name,
                "description": m.description,
            }
            for m in methods
        ]

    @staticmethod
    def generate_daily_summary(db: Session) -> dict:
        raffles = db.query(Raffle).filter(Raffle.status == "ACTIVE").all()
        now = datetime.now(timezone.utc)
        alerts = []

        for r in raffles:
            draw_dt = r.draw_date if r.draw_date.tzinfo else r.draw_date.replace(tzinfo=timezone.utc)
            days_left = max(0, (draw_dt - now).days)
            total_t = db.query(Ticket).filter(Ticket.raffle_id == r.id).count()
            paid_t = db.query(Ticket).filter(and_(Ticket.raffle_id == r.id, Ticket.status == "PAID")).count()
            pct = round((paid_t / total_t * 100), 1) if total_t > 0 else 0

            alerts.append({
                "raffle_id": str(r.id),
                "title": r.title,
                "days_remaining": days_left,
                "sales_percentage": pct,
                "paid_tickets": paid_t,
                "total_tickets": total_t,
            })

        return {"generated_at": now.isoformat(), "active_raffles_summary": alerts}