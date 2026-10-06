from collections.abc import Callable

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import User
from app.security import decode_token

bearer = HTTPBearer(auto_error=False)


def get_current_user(
    credentials: HTTPAuthorizationCredentials | None = Depends(bearer),
    db: Session = Depends(get_db),
) -> User:
    unauthorized = HTTPException(status.HTTP_401_UNAUTHORIZED, "Please login again")
    if credentials is None:
        raise unauthorized
    payload = decode_token(credentials.credentials)
    if payload is None:
        raise unauthorized
    user = db.get(User, int(payload["sub"]))
    if user is None or user.token_version != payload.get("ver"):
        raise unauthorized
    if user.status != "active":
        raise HTTPException(status.HTTP_403_FORBIDDEN, f"Your account is {user.status}")
    return user


def require_role(*roles: str) -> Callable[..., User]:
    def checker(user: User = Depends(get_current_user)) -> User:
        if user.role not in roles:
            raise HTTPException(status.HTTP_403_FORBIDDEN, "You are not allowed to do this")
        return user

    return checker


def require_super_admin(user: User = Depends(get_current_user)) -> User:
    """The app owner: an admin who can also add and remove other admins."""
    if user.role != "admin" or not user.is_super_admin:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Only the super admin can do this")
    return user


def ensure_onboarded(user: User) -> None:
    if user.role != "admin" and not user.onboarded:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Finish setting up your profile first")


def get_or_404(db: Session, model: type, item_id: int, label: str):
    item = db.get(model, item_id)
    if item is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, f"{label} not found")
    return item
