from datetime import date
from typing import Literal

from pydantic import Field, model_validator

from app.schemas.base import CamelModel


class SectorIn(CamelModel):
    name: str = Field(min_length=2, max_length=50)
    icon: str = Field(default="work", max_length=40)
    tier: Literal["normal", "premium"] = "normal"


class JobIn(CamelModel):
    title: str = Field(min_length=3, max_length=80)
    description: str = Field(min_length=20, max_length=2000)
    sector_id: int | None = None
    proposed_sector: str | None = Field(default=None, min_length=2, max_length=50)
    city: str = Field(min_length=2, max_length=60)
    address: str | None = Field(default=None, max_length=200)
    salary_min: int = Field(ge=100, le=50_000_000)
    salary_max: int = Field(ge=100, le=50_000_000)
    salary_period: Literal["month", "day", "year"] = "month"
    shift: Literal["day", "night", "flexible"] = "day"
    openings: int = Field(default=1, ge=1, le=100)
    # Premium jobs only (ignored for normal jobs)
    employment_type: Literal["full_time", "part_time", "contract", "internship"] | None = None
    min_experience: int | None = Field(default=None, ge=0, le=50)
    qualification: str | None = Field(default=None, max_length=100)
    required_skills: list[str] | None = Field(default=None, max_length=20)

    @model_validator(mode="after")
    def check(self) -> "JobIn":
        if self.salary_max < self.salary_min:
            raise ValueError("Maximum salary must be at least the minimum salary")
        if (self.sector_id is None) == (self.proposed_sector is None):
            raise ValueError("Choose a sector or suggest a new one")
        return self


class ApplicationIn(CamelModel):
    job_id: int
    message: str = Field(min_length=20, max_length=500)
    expected_salary: int | None = Field(default=None, ge=100, le=50_000_000)
    available_from: date | None = None
    share_phone: bool = False


class ApplicationStatusIn(CamelModel):
    status: Literal["shortlisted", "hired", "rejected"]


class MessageIn(CamelModel):
    text: str = Field(min_length=1, max_length=1000)


class TicketIn(CamelModel):
    topic: Literal["account", "jobs", "payments", "safety", "other"]
    message: str = Field(min_length=20, max_length=1000)


class ReportIn(CamelModel):
    target_type: Literal["job", "user"]
    target_id: int
    reason: Literal["fraud", "unsafe", "inappropriate", "misleading", "other"]
    details: str | None = Field(default=None, max_length=500)
