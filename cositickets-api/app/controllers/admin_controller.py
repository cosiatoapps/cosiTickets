from datetime import datetime
from uuid import UUID
from fastapi import HTTPException
from sqlalchemy.orm import Session

from app.models import (
    User,
    UserPasswordHistory,
    OrganizerLimit,
    SecurityPolicy,
    Raffle,
    AuditLog,
)
from app.schemas.domain import OrganizerCreate, PolicyUpdate
from app.core.security import hash_password, validate_password_against_policy


class AdminController:

    @staticmethod
    def get_security_policies(db: Session) -> dict:
        policy = db.query(SecurityPolicy).filter(SecurityPolicy.policy_scope == "GLOBAL").first()
        if not policy:
            policy = SecurityPolicy(policy_scope="GLOBAL")
            db.add(policy)
            db.commit()
            db.refresh(policy)

        return {
            "id": str(policy.id),
            "policy_scope": policy.policy_scope,
            "min_length": policy.min_length,
            "max_length": policy.max_length,
            "require_uppercase": policy.require_uppercase,
            "require_lowercase": policy.require_lowercase,
            "require_numbers": policy.require_numbers,
            "require_special_chars": policy.require_special_chars,
            "min_special_chars": policy.min_special_chars,
            "password_expiration_days": policy.password_expiration_days,
            "password_history_limit": policy.password_history_limit,
            "max_failed_attempts": policy.max_failed_attempts,
            "lockout_duration_minutes": policy.lockout_duration_minutes,
            "mfa_required": policy.mfa_required,
            "updated_at": policy.updated_at,
        }

    @staticmethod
    def update_security_policies(payload: PolicyUpdate, db: Session) -> dict:
        policy = db.query(SecurityPolicy).filter(SecurityPolicy.policy_scope == "GLOBAL").first()
        if not policy:
            policy = SecurityPolicy(policy_scope="GLOBAL")
            db.add(policy)

        for key, value in payload.model_dump().items():
            setattr(policy, key, value)

        policy.updated_at = datetime.utcnow()
        db.commit()
        db.refresh(policy)
        return {"message": "Políticas actualizadas exitosamente", "policy": policy}

    @staticmethod
    def list_users(db: Session) -> list[dict]:
        users = db.query(User).order_by(User.created_at.desc()).all()
        return [
            {
                "id": str(u.id),
                "name": u.name,
                "email": u.email,
                "phone": u.phone,
                "role": u.role.value if hasattr(u.role, "value") else str(u.role),
                "is_active": u.is_active,
                "created_at": u.created_at.isoformat() if u.created_at else None,
            }
            for u in users
        ]

    @staticmethod
    def toggle_user_status(user_id: UUID, is_active: bool, db: Session) -> dict:
        user = db.query(User).filter(User.id == user_id).first()
        if not user:
            raise HTTPException(status_code=404, detail="Usuario no encontrado.")
        user.is_active = is_active
        db.commit()
        return {"message": "Estado actualizado", "user_id": str(user.id), "is_active": user.is_active}

    @staticmethod
    def create_organizer(payload: OrganizerCreate, db: Session) -> User:
        if db.query(User).filter(User.email == payload.email).first():
            raise HTTPException(status_code=400, detail="El correo ya se encuentra registrado.")

        validate_password_against_policy(payload.password, db)
        hashed_pwd = hash_password(payload.password)

        organizer = User(
            name=payload.name,
            email=payload.email,
            phone=payload.phone,
            password_hash=hashed_pwd,
            role="ORGANIZER",
        )
        db.add(organizer)
        db.commit()
        db.refresh(organizer)

        db.add(UserPasswordHistory(user_id=organizer.id, password_hash=hashed_pwd))
        db.add(
            OrganizerLimit(
                organizer_id=organizer.id,
                max_total_raffles=payload.max_total_raffles,
                max_monthly_raffles=payload.max_monthly_raffles,
            )
        )
        db.commit()
        return organizer

    @staticmethod
    def list_organizers_raffles(db: Session) -> list[dict]:
        organizers = db.query(User).filter(User.role == "ORGANIZER").all()
        result = []
        for org in organizers:
            raffles = db.query(Raffle).filter(Raffle.organizer_id == org.id).all()
            result.append({
                "organizer_id": str(org.id),
                "organizer_name": org.name,
                "organizer_email": org.email,
                "total_raffles": len(raffles),
                "raffles": [
                    {
                        "id": str(r.id),
                        "title": r.title,
                        "ticket_price": float(r.ticket_price),
                        "numbers_per_ticket": r.numbers_per_ticket,
                        "draw_date": r.draw_date.isoformat() if r.draw_date else None,
                        "status": r.status.value if hasattr(r.status, "value") else str(r.status),
                    }
                    for r in raffles
                ],
            })
        return result

    @staticmethod
    def list_audit_logs(db: Session) -> list[dict]:
        logs = db.query(AuditLog).order_by(AuditLog.created_at.desc()).limit(50).all()
        return [
            {
                "id": str(l.id),
                "entity_name": l.entity_name,
                "entity_id": str(l.entity_id),
                "actor_id": str(l.actor_id),
                "action": l.action.value if hasattr(l.action, "value") else str(l.action),
                "old_values": l.old_values,
                "new_values": l.new_values,
                "created_at": l.created_at.isoformat() if l.created_at else None,
            }
            for l in logs
        ]