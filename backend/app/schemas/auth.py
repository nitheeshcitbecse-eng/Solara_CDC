from typing import Literal

from pydantic import EmailStr, Field, model_validator

from app.schemas.base import CamelModel

PHONE_PATTERN = r"^[6-9]\d{9}$"  # Indian mobile number, 10 digits


def password_field():
    return Field(min_length=8, max_length=72)


class RegisterIn(CamelModel):
    name: str = Field(min_length=2, max_length=80)
    email: EmailStr | None = None
    phone: str = Field(pattern=PHONE_PATTERN)
    password: str = password_field()
    role: Literal["seeker", "hirer"]
    tier: Literal["normal", "premium"]

    @model_validator(mode="after")
    def check(self) -> "RegisterIn":
        if self.tier == "premium" and not self.email:
            raise ValueError("Email is required for premium accounts")
        return self


class LoginIn(CamelModel):
    # Email address or 10-digit mobile number
    identifier: str = Field(min_length=3, max_length=254)
    password: str = Field(min_length=1, max_length=72)


class SendResetOtpIn(CamelModel):
    email: EmailStr


class ResetPasswordIn(CamelModel):
    email: EmailStr
    otp: str = Field(pattern=r"^\d{6}$")
    new_password: str = password_field()


class ChangePasswordIn(CamelModel):
    old_password: str = Field(min_length=1, max_length=72)
    new_password: str = password_field()


# ── Premium answers (stored in users.details) ────────────────────────────────


def short(limit: int):
    return Field(default=None, max_length=limit)


class PremiumSeekerDetails(CamelModel):
    profession: str | None = short(60)
    specialization: str | None = short(80)
    qualification: str | None = short(80)
    institution: str | None = short(120)
    graduation_year: int | None = Field(default=None, ge=1950, le=2035)
    license_number: str | None = short(60)
    current_employer: str | None = short(100)
    current_designation: str | None = short(80)
    expected_salary: int | None = Field(default=None, ge=0, le=100_000_000)  # ₹ per year
    notice_period: Literal["immediate", "15_days", "1_month", "2_months", "3_months"] | None = None
    preferred_cities: list[str] | None = Field(default=None, max_length=10)
    languages: list[str] | None = Field(default=None, max_length=10)
    linkedin_url: str | None = short(200)


class PremiumHirerDetails(CamelModel):
    organization_type: Literal["hospital", "clinic", "company", "startup", "school", "government", "other"] | None = None
    registration_number: str | None = short(40)  # GST / CIN / hospital registration
    website: str | None = short(200)
    designation: str | None = short(80)
    company_size: Literal["1-10", "11-50", "51-200", "201-1000", "1000+"] | None = None
    office_address: str | None = short(200)


class UpdateProfileIn(CamelModel):
    name: str | None = Field(default=None, min_length=2, max_length=80)
    email: EmailStr | None = None
    phone: str | None = Field(default=None, pattern=PHONE_PATTERN)
    city: str | None = Field(default=None, max_length=60)
    about: str | None = Field(default=None, max_length=1000)
    skills: list[str] | None = Field(default=None, max_length=20)
    experience_years: int | None = Field(default=None, ge=0, le=60)
    business_name: str | None = Field(default=None, max_length=100)
    # Validated against PremiumSeekerDetails / PremiumHirerDetails depending on the user.
    details: dict | None = None
