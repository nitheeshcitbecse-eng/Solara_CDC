from sqlalchemy.orm import Session

from app.models import AuditLog, Notification, User


def notify(db: Session, user_id: int, title: str, body: str) -> None:
    """Adds an in-app notification. The caller commits."""
    db.add(Notification(user_id=user_id, title=title, body=body[:300]))


def audit(db: Session, admin: User, action: str, target: str, details: str | None = None) -> None:
    """Records an admin action. The caller commits."""
    db.add(AuditLog(admin_id=admin.id, action=action, target=target, details=details))
