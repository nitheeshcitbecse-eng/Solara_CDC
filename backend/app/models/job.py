from datetime import date

from sqlalchemy import Date, ForeignKey, Integer, String, Text, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base, TimestampMixin
from app.models.user import User

JOB_STATUSES = ("active", "pending_review", "rejected", "closed", "taken_down")
SHIFTS = ("day", "night", "flexible")
SALARY_PERIODS = ("month", "day", "year")
EMPLOYMENT_TYPES = ("full_time", "part_time", "contract", "internship")


class Sector(TimestampMixin, Base):
    __tablename__ = "sectors"
    __table_args__ = (UniqueConstraint("name", "tier"),)

    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(50))
    tier: Mapped[str] = mapped_column(String(10), default="normal", index=True)
    icon: Mapped[str] = mapped_column(String(40), default="work")  # MaterialIcons name


class Job(TimestampMixin, Base):
    __tablename__ = "jobs"

    id: Mapped[int] = mapped_column(primary_key=True)
    hirer_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    sector_id: Mapped[int | None] = mapped_column(ForeignKey("sectors.id", ondelete="RESTRICT"), index=True)
    # A sector the hirer suggested that doesn't exist yet; the admin approves it with the job.
    proposed_sector: Mapped[str | None] = mapped_column(String(50))

    title: Mapped[str] = mapped_column(String(80))
    description: Mapped[str] = mapped_column(Text)
    city: Mapped[str] = mapped_column(String(60), index=True)
    address: Mapped[str | None] = mapped_column(String(200))
    salary_min: Mapped[int] = mapped_column(Integer)
    salary_max: Mapped[int] = mapped_column(Integer)
    salary_period: Mapped[str] = mapped_column(String(10), default="month")
    shift: Mapped[str] = mapped_column(String(10), default="day")
    openings: Mapped[int] = mapped_column(Integer, default=1)

    # Copied from the hirer when the job is posted; only seekers of the same tier can see it.
    tier: Mapped[str] = mapped_column(String(10), default="normal", index=True)

    # Premium jobs only
    employment_type: Mapped[str | None] = mapped_column(String(15))
    min_experience: Mapped[int | None] = mapped_column(Integer)
    qualification: Mapped[str | None] = mapped_column(String(100))
    required_skills: Mapped[str | None] = mapped_column(String(300))

    status: Mapped[str] = mapped_column(String(15), default="active", index=True)
    review_note: Mapped[str | None] = mapped_column(String(300))

    hirer: Mapped[User] = relationship(lazy="joined")
    sector: Mapped[Sector | None] = relationship(lazy="joined")
    photos: Mapped[list["JobPhoto"]] = relationship(
        back_populates="job", cascade="all, delete-orphan", order_by="JobPhoto.id", lazy="selectin"
    )


class JobPhoto(Base):
    __tablename__ = "job_photos"

    id: Mapped[int] = mapped_column(primary_key=True)
    job_id: Mapped[int] = mapped_column(ForeignKey("jobs.id", ondelete="CASCADE"), index=True)
    path: Mapped[str] = mapped_column(String(255))

    job: Mapped[Job] = relationship(back_populates="photos")


class SavedJob(TimestampMixin, Base):
    __tablename__ = "saved_jobs"
    __table_args__ = (UniqueConstraint("user_id", "job_id"),)

    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    job_id: Mapped[int] = mapped_column(ForeignKey("jobs.id", ondelete="CASCADE"))


APPLICATION_STATUSES = ("applied", "shortlisted", "hired", "rejected")
# Premium only: a hirer sees a professional's phone/email and can chat only after the owner approves.
CONTACT_STATUSES = ("none", "pending", "approved", "rejected")


class Application(TimestampMixin, Base):
    __tablename__ = "applications"
    __table_args__ = (UniqueConstraint("job_id", "seeker_id"),)

    id: Mapped[int] = mapped_column(primary_key=True)
    job_id: Mapped[int] = mapped_column(ForeignKey("jobs.id", ondelete="CASCADE"), index=True)
    seeker_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    message: Mapped[str] = mapped_column(Text)
    expected_salary: Mapped[int | None] = mapped_column(Integer)
    available_from: Mapped[date | None] = mapped_column(Date)
    share_phone: Mapped[bool] = mapped_column(default=False)
    status: Mapped[str] = mapped_column(String(12), default="applied")
    seen_by_hirer: Mapped[bool] = mapped_column(default=False)
    contact_status: Mapped[str] = mapped_column(String(10), default="none", index=True)
    contact_note: Mapped[str | None] = mapped_column(String(300))

    job: Mapped[Job] = relationship(lazy="joined")
    seeker: Mapped[User] = relationship(lazy="joined")
