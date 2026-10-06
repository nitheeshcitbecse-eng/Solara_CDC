from typing import Any

from sqlalchemy import JSON, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base, TimestampMixin

ROLES = ("seeker", "hirer", "admin")
# normal = daily-wage work (construction, house help…), premium = professionals (doctors, engineers…).
# Seekers and hirers only ever see people and jobs of their own tier. Admins have no tier.
TIERS = ("normal", "premium")
ACCOUNT_STATUSES = ("active", "suspended", "banned")
VERIFICATION_STATUSES = ("none", "pending", "verified", "rejected")


class User(TimestampMixin, Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(80))
    # Normal-tier users may sign up with a mobile number only.
    email: Mapped[str | None] = mapped_column(String(254), unique=True, index=True)
    phone: Mapped[str | None] = mapped_column(String(15), unique=True, index=True)
    password_hash: Mapped[str] = mapped_column(String(100))
    role: Mapped[str] = mapped_column(String(10), index=True)
    tier: Mapped[str | None] = mapped_column(String(10), index=True)
    status: Mapped[str] = mapped_column(String(10), default="active")
    status_reason: Mapped[str | None] = mapped_column(String(300))
    token_version: Mapped[int] = mapped_column(Integer, default=0)
    onboarded: Mapped[bool] = mapped_column(default=False)
    # Admins moderate the platform; the super admin (the owner) can also add and remove admins.
    is_super_admin: Mapped[bool] = mapped_column(default=False, server_default="false")

    photo_path: Mapped[str | None] = mapped_column(String(255))
    city: Mapped[str | None] = mapped_column(String(60))
    about: Mapped[str | None] = mapped_column(Text)

    # Job seeker
    skills: Mapped[str | None] = mapped_column(String(300))  # comma separated
    experience_years: Mapped[int | None] = mapped_column(Integer)

    # Hirer (business or organisation name)
    business_name: Mapped[str | None] = mapped_column(String(100))

    # Premium answers (profession, qualification, organisation type…); see schemas/auth.py
    details: Mapped[dict[str, Any]] = mapped_column(JSON, default=dict)

    # Identity verification (Aadhaar) — every seeker and hirer uploads it during onboarding
    verification_status: Mapped[str] = mapped_column(String(10), default="none")
    verification_note: Mapped[str | None] = mapped_column(String(300))
    aadhaar_last4: Mapped[str | None] = mapped_column(String(4))
    aadhaar_front_path: Mapped[str | None] = mapped_column(String(255))
    aadhaar_back_path: Mapped[str | None] = mapped_column(String(255))
