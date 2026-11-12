from datetime import datetime, timezone
from typing import Optional
from uuid import UUID
from sqlalchemy.orm import Session
from sqlalchemy import and_

from app.models import Raffle, Ticket, CustomerPurchase, User


class AnalyticsController:

    @staticmethod
    def get_dashboard_metrics(db: Session, organizer_id: Optional[UUID] = None) -> dict:
        query = db.query(Raffle)
        if organizer_id:
            query = query.filter(Raffle.organizer_id == organizer_id)

        raffles = query.order_by(Raffle.draw_date.asc()).all()
        now = datetime.now(timezone.utc)

        raffles_analytics = []
        total_budgeted_all = 0.0
        total_collected_all = 0.0
        total_committed_all = 0.0
        total_prize_cost_all = 0.0

        for r in raffles:
            tickets = db.query(Ticket).filter(Ticket.raffle_id == r.id).all()
            total_t = len(tickets)
            paid_t = sum(1 for t in tickets if (t.status.value if hasattr(t.status, "value") else t.status) == "PAID")
            reserved_t = sum(1 for t in tickets if (t.status.value if hasattr(t.status, "value") else t.status) == "RESERVED")
            avail_t = total_t - (paid_t + reserved_t)

            ticket_price = float(r.ticket_price or 0)
            prize_cost = float(getattr(r, "prize_cost", 0) or 0)
            budgeted_value = total_t * ticket_price

            purchases = db.query(CustomerPurchase).filter(CustomerPurchase.raffle_id == r.id).all()
            collected_value = sum(float(p.balance_paid or 0) for p in purchases)
            committed_value = (paid_t + reserved_t) * ticket_price
            pending_collection = max(0.0, committed_value - collected_value)

            # Productividad: Retorno sobre costo del premio y punto de equilibrio
            net_profit = collected_value - prize_cost
            roi_pct = round((net_profit / prize_cost * 100), 1) if prize_cost > 0 else 100.0
            breakeven_pct = min(100.0, round((collected_value / prize_cost * 100), 1)) if prize_cost > 0 else 100.0

            draw_dt = r.draw_date if r.draw_date.tzinfo else r.draw_date.replace(tzinfo=timezone.utc)
            days_left = (draw_dt - now).days
            status_str = r.status.value if hasattr(r.status, "value") else str(r.status)

            organizer = db.query(User).filter(User.id == r.organizer_id).first()

            total_budgeted_all += budgeted_value
            total_collected_all += collected_value
            total_committed_all += committed_value
            total_prize_cost_all += prize_cost

            raffles_analytics.append({
                "raffle_id": str(r.id),
                "title": r.title,
                "prize_name": r.prize_name,
                "organizer_name": organizer.name if organizer else "N/A",
                "status": status_str,
                "draw_date": r.draw_date.isoformat(),
                "days_remaining": days_left,
                "urgency": (
                    "CLOSED" if status_str != "ACTIVE" or days_left < 0
                    else "CRITICAL" if days_left <= 3
                    else "WARNING" if days_left <= 7
                    else "ON_TRACK"
                ),
                "sales": {
                    "total_tickets": total_t,
                    "paid": paid_t,
                    "reserved": reserved_t,
                    "available": avail_t,
                    "paid_pct": round((paid_t / total_t * 100), 1) if total_t > 0 else 0,
                    "reserved_pct": round((reserved_t / total_t * 100), 1) if total_t > 0 else 0,
                    "occupied_pct": round(((paid_t + reserved_t) / total_t * 100), 1) if total_t > 0 else 0,
                },
                "financials": {
                    "ticket_price": ticket_price,
                    "budgeted_value": budgeted_value,
                    "committed_value": committed_value,
                    "collected_value": collected_value,
                    "pending_collection": pending_collection,
                    "collection_rate_pct": round((collected_value / budgeted_value * 100), 1) if budgeted_value > 0 else 0,
                },
                "productivity": {
                    "prize_cost": prize_cost,
                    "collected_value": collected_value,
                    "net_profit": net_profit,
                    "roi_pct": roi_pct,
                    "breakeven_pct": breakeven_pct,
                    "is_profitable": collected_value >= prize_cost,
                },
            })

        upcoming_raffles = sorted(
            [r for r in raffles_analytics if r["status"] == "ACTIVE" and r["days_remaining"] >= 0],
            key=lambda x: x["days_remaining"],
        )

        return {
            "scope": "ORGANIZER" if organizer_id else "ADMIN_GLOBAL",
            "kpis": {
                "total_raffles": len(raffles_analytics),
                "active_raffles": sum(1 for r in raffles_analytics if r["status"] == "ACTIVE"),
                "total_budgeted": total_budgeted_all,
                "total_collected": total_collected_all,
                "total_pending_collection": max(0.0, total_committed_all - total_collected_all),
                "total_prize_cost": total_prize_cost_all,
                "global_net_profit": total_collected_all - total_prize_cost_all,
                "global_execution_pct": round((total_collected_all / total_budgeted_all * 100), 1)
                if total_budgeted_all > 0
                else 0,
            },
            "upcoming_raffles": upcoming_raffles,
            "raffles": raffles_analytics,
        }