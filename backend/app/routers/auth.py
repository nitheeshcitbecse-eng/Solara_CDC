from datetime import timedelta

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, status
from pydantic import ValidationError
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.database import as_utc, get_db, utcnow
from app.deps import get_current_user
from app.models import PasswordResetOtp, User
from app.responses import ok
from app.schemas.auth import (
    ChangePasswordIn,
    LoginIn,
    PremiumHirerDetails,
    PremiumSeekerDetails,
    RegisterIn,
    ResetPasswordIn,
    SendResetOtpIn,
    UpdateProfileIn,
)
from app.security import create_token, generate_otp, hash_otp, hash_password, verify_password
from app.serializers import user_dict
from app.services.email import send_email

router = APIRouter(prefix="/auth", tags=["auth"])

OTP_TTL = timedelta(minutes=10)
OTP_MAX_ATTEMPTS = 5
OTP_MAX_SENDS = 3  # per email per 15 minutes
OTP_SEND_WINDOW = timedelta(minutes=15)


def _find_by_email(db: Session, email: str) -> User | None:
    return db.scalar(select(User).where(User.email == email.lower()))


def _find_by_phone(db: Session, phone: str) -> User | None:
    return db.scalar(select(User).where(User.phone == phone))


def _find_by_identifier(db: Session, identifier: str) -> User | None:
    """Login accepts an email address or a 10-digit mobile number (spaces and +91 are ignored)."""
    value = identifier.strip()
    if "@" in value:
        return _find_by_email(db, value)
    digits = "".join(ch for ch in value if ch.isdigit())
    return _find_by_phone(db, digits[-10:]) if len(digits) >= 10 else None


@router.post("/register", status_code=status.HTTP_201_CREATED)
def register(body: RegisterIn, db: Session = Depends(get_db)):
    if body.email and _find_by_email(db, body.email):
        raise HTTPException(status.HTTP_409_CONFLICT, "An account with this email already exists")
    if _find_by_phone(db, body.phone):
        raise HTTPException(status.HTTP_409_CONFLICT, "An account with this mobile number already exists")
    user = User(
        name=body.name,
        email=body.email.lower() if body.email else None,
        phone=body.phone,
        password_hash=hash_password(body.password),
        role=body.role,
        tier=body.tier,
        details={},
    )
    db.add(user)
    db.commit()
    return ok("Account created", token=create_token(user.id, user.token_version), user=user_dict(user))


@router.post("/login")
def login(body: LoginIn, db: Session = Depends(get_db)):
    user = _find_by_identifier(db, body.identifier)
    if user is None or not verify_password(body.password, user.password_hash):
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Invalid login details or password")
    if user.status != "active":
        raise HTTPException(status.HTTP_403_FORBIDDEN, f"Your account is {user.status}. Contact support.")
    return ok(token=create_token(user.id, user.token_version), user=user_dict(user))


@router.get("/profile")
def profile(user: User = Depends(get_current_user)):
    return ok(user=user_dict(user))


@router.post("/logout")
def logout(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    # Bumping the version invalidates every token issued so far.
    user.token_version += 1
    db.commit()
    return ok("Logged out")


def _clean_list(values: list[str] | None) -> list[str]:
    items = [value.strip().replace(",", " ") for value in values or [] if value and value.strip()]
    return list(dict.fromkeys(items))


def _merge_details(user: User, raw: dict) -> None:
    """Validates premium answers for this kind of user and merges them into users.details."""
    if user.tier != "premium" or user.role not in ("seeker", "hirer"):
        return
    schema = PremiumSeekerDetails if user.role == "seeker" else PremiumHirerDetails
    try:
        parsed = schema.model_validate(raw)
    except ValidationError as exc:
        error = exc.errors()[0]
        field = ".".join(str(part) for part in error["loc"])
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_CONTENT, f"{field}: {error['msg']}") from exc
    merged = dict(user.details or {})
    for key, value in parsed.model_dump(exclude_unset=True).items():
        if isinstance(value, list):
            value = _clean_list(value)
        if isinstance(value, str):
            value = value.strip()
        if value in (None, "", []):
            merged.pop(key, None)
        else:
            merged[key] = value
    user.details = merged  # a new dict so SQLAlchemy notices the change


@router.put("/update-profile")
def update_profile(body: UpdateProfileIn, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    changes = body.model_dump(exclude_unset=True)
    if "details" in changes:
        _merge_details(user, changes.pop("details") or {})
    if "skills" in changes:
        user.skills = ",".join(_clean_list(changes.pop("skills"))) or None
    if "email" in changes:
        email = changes.pop("email")
        email = email.lower() if email else None
        if email is None and user.tier == "premium":
            raise HTTPException(status.HTTP_400_BAD_REQUEST, "Premium accounts need an email address")
        if email and email != user.email and _find_by_email(db, email):
            raise HTTPException(status.HTTP_409_CONFLICT, "An account with this email already exists")
        user.email = email
    if changes.get("phone") and changes["phone"] != user.phone and _find_by_phone(db, changes["phone"]):
        raise HTTPException(status.HTTP_409_CONFLICT, "An account with this mobile number already exists")
    if "phone" in changes and not changes["phone"]:
        changes.pop("phone")  # the mobile number can be changed but not removed
    if user.role != "hirer":
        changes.pop("business_name", None)
    if user.role != "seeker":
        changes.pop("experience_years", None)
    for field, value in changes.items():
        if isinstance(value, str):
            value = value or None  # an emptied field is stored as NULL
        if field == "name" and value is None:
            continue
        setattr(user, field, value)
    db.commit()
    return ok("Profile updated", user=user_dict(user))


@router.post("/send-reset-otp")
def send_reset_otp(body: SendResetOtpIn, background: BackgroundTasks, db: Session = Depends(get_db)):
    email = body.email.lower()
    # Same answer whether or not the account exists, so emails can't be discovered here.
    message = "If an account exists for this email, a 6-digit code has been sent"
    user = _find_by_email(db, email)
    if user is None:
        return ok(message)

    recent = db.scalar(
        select(func.count(PasswordResetOtp.id)).where(
            PasswordResetOtp.email == email, PasswordResetOtp.created_at > utcnow() - OTP_SEND_WINDOW
        )
    )
    if recent >= OTP_MAX_SENDS:
        raise HTTPException(status.HTTP_429_TOO_MANY_REQUESTS, "Too many requests. Try again in 15 minutes.")

    code = generate_otp()
    db.add(PasswordResetOtp(email=email, code_hash=hash_otp(email, code), expires_at=utcnow() + OTP_TTL))
    db.commit()
    background.add_task(
        send_email,
        email,
        "Your Solara password reset code",
        f"Hello {user.name},\n\nYour password reset code is {code}. It expires in 10 minutes.\n\n"
        "If you didn't ask for this, you can ignore this email.",
    )
    return ok(message)


@router.post("/reset-password")
def reset_password(body: ResetPasswordIn, db: Session = Depends(get_db)):
    email = body.email.lower()
    invalid = HTTPException(status.HTTP_400_BAD_REQUEST, "Invalid or expired code")
    otp = db.scalar(
        select(PasswordResetOtp)
        .where(PasswordResetOtp.email == email, PasswordResetOtp.used.is_(False))
        .order_by(PasswordResetOtp.id.desc())
    )
    if otp is None or as_utc(otp.expires_at) < utcnow() or otp.attempts >= OTP_MAX_ATTEMPTS:
        raise invalid
    if otp.code_hash != hash_otp(email, body.otp):
        otp.attempts += 1
        db.commit()
        raise invalid

    user = _find_by_email(db, email)
    if user is None:
        raise invalid
    otp.used = True
    user.password_hash = hash_password(body.new_password)
    user.token_version += 1
    db.commit()
    return ok("Password reset. Please login with your new password.")


@router.put("/change-password")
def change_password(body: ChangePasswordIn, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    if not verify_password(body.old_password, user.password_hash):
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Current password is incorrect")
    if body.old_password == body.new_password:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "New password must be different")
    user.password_hash = hash_password(body.new_password)
    # Signs out other devices; this device gets a fresh token.
    user.token_version += 1
    db.commit()
    return ok("Password changed", token=create_token(user.id, user.token_version))
