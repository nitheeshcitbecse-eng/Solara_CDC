"""Creates the tables, the default sectors and the owner (admin) account.

    python -m app.seed                   # sectors + admin
    python -m app.seed --demo            # also demo workers, hirers and jobs for both tiers
    python -m app.seed --reset --demo    # DELETES ALL DATA first (use after the schema changes)
"""

import sys

from sqlalchemy import select
from sqlalchemy.orm import Session

from app import models  # noqa: F401
from app.config import get_settings
from app.database import Base, SessionLocal, engine
from app.models import Job, Sector, User
from app.security import hash_password
from app.upgrades import apply_upgrades

SECTORS = {
    "normal": [
        ("Construction", "construction"),
        ("House Help", "cleaning-services"),
        ("Cooking", "restaurant"),
        ("Driving", "directions-car"),
        ("Caretaking", "elderly"),
        ("Security", "security"),
        ("Delivery", "local-shipping"),
    ],
    "premium": [
        ("Healthcare", "local-hospital"),
        ("Engineering", "engineering"),
        ("IT & Software", "computer"),
        ("Education", "school"),
        ("Finance & Accounts", "account-balance"),
        ("Legal", "gavel"),
    ],
}

DEMO_PASSWORD = "Demo@1234"


def _user(db: Session, email: str, **fields) -> User:
    user = db.scalar(select(User).where(User.email == email))
    if user is None:
        user = User(email=email, **fields)
        db.add(user)
        db.flush()
    return user


def _demo_users(db: Session) -> tuple[User, User]:
    password = hash_password(DEMO_PASSWORD)
    _user(
        db, "seeker@solara.app", name="Prasina Selvam", role="seeker", tier="normal", phone="9876543210",
        city="Chennai", skills="Cooking,House Help", experience_years=3, onboarded=True,
        verification_status="verified", aadhaar_last4="1234", password_hash=password, details={},
    )
    _user(
        db, "doctor@solara.app", name="Dr. Karthik Raman", role="seeker", tier="premium", phone="9876543211",
        city="Chennai", skills="General Medicine,Emergency Care", experience_years=6, onboarded=True,
        verification_status="verified", aadhaar_last4="5678", password_hash=password,
        about="MBBS, MD with six years in emergency and general medicine.",
        details={
            "profession": "Doctor",
            "specialization": "General Medicine",
            "qualification": "MBBS, MD",
            "institution": "Madras Medical College",
            "graduation_year": 2016,
            "license_number": "TNMC 123456",
            "notice_period": "1_month",
            "languages": ["English", "Tamil", "Hindi"],
            "preferred_cities": ["Chennai", "Bengaluru"],
        },
    )
    normal_hirer = _user(
        db, "hirer@solara.app", name="Arun Kumar", role="hirer", tier="normal", phone="9876500001",
        city="Chennai", business_name="Arun Home Services", onboarded=True, verification_status="verified",
        aadhaar_last4="4821", password_hash=password, details={},
    )
    premium_hirer = _user(
        db, "hospital@solara.app", name="Meera Iyer", role="hirer", tier="premium", phone="9876500002",
        city="Chennai", business_name="Sunrise Multispeciality Hospital", onboarded=True,
        verification_status="verified", aadhaar_last4="9090", password_hash=password,
        details={
            "organization_type": "hospital",
            "designation": "HR Manager",
            "company_size": "201-1000",
            "office_address": "12 Greams Road, Chennai",
            "registration_number": "TN-HOSP-2041",
        },
    )
    return normal_hirer, premium_hirer


def _demo_jobs(db: Session, normal_hirer: User, premium_hirer: User) -> None:
    if db.scalar(select(Job).where(Job.hirer_id.in_([normal_hirer.id, premium_hirer.id]))) is not None:
        return
    sectors = {(sector.name, sector.tier): sector for sector in db.scalars(select(Sector))}

    def normal(sector: str, **fields) -> Job:
        return Job(hirer_id=normal_hirer.id, tier="normal", sector_id=sectors[(sector, "normal")].id, **fields)

    def premium(sector: str, **fields) -> Job:
        return Job(hirer_id=premium_hirer.id, tier="premium", sector_id=sectors[(sector, "premium")].id, **fields)

    db.add_all(
        [
            normal("Construction", title="Mason helper for a house build",
                   description="Carry bricks and cement, mix mortar and help the mason. Lunch and tea provided.",
                   city="Chennai", address="Tambaram", salary_min=700, salary_max=850, salary_period="day",
                   shift="day", openings=4),
            normal("House Help", title="House help for a family of four",
                   description="Sweeping, mopping, washing vessels and folding clothes, 9 am to 1 pm.",
                   city="Chennai", address="Adyar", salary_min=9000, salary_max=11000, salary_period="month"),
            normal("Driving", title="Car driver for office commute",
                   description="Drive an automatic sedan between Velachery and OMR on weekdays. Valid licence needed.",
                   city="Chennai", address="Velachery", salary_min=18000, salary_max=22000, salary_period="month"),
            premium("Healthcare", title="General Physician (OPD)",
                    description="Run the general OPD, handle follow-ups and coordinate with specialists. "
                    "Rotating weekend duty.",
                    city="Chennai", address="Greams Road", salary_min=1800000, salary_max=2400000,
                    salary_period="year", employment_type="full_time", min_experience=3,
                    qualification="MBBS, MD (General Medicine)", required_skills="OPD,Patient Care,Diagnosis"),
            premium("Engineering", title="Biomedical Engineer",
                    description="Maintain ICU and theatre equipment, plan preventive maintenance and train staff.",
                    city="Chennai", salary_min=600000, salary_max=900000, salary_period="year",
                    employment_type="full_time", min_experience=2, qualification="B.E. Biomedical Engineering",
                    required_skills="Equipment Maintenance,Calibration"),
            premium("IT & Software", title="Full-stack Developer (Hospital Systems)",
                    description="Build and maintain the hospital's patient portal and internal tools.",
                    city="Chennai", salary_min=800000, salary_max=1400000, salary_period="year",
                    employment_type="full_time", min_experience=2, qualification="B.E. / B.Tech",
                    required_skills="React,Python,PostgreSQL"),
        ]
    )


def seed(demo: bool = False, reset: bool = False) -> None:
    if reset:
        Base.metadata.drop_all(engine)
    Base.metadata.create_all(engine)
    for column in apply_upgrades(engine):
        print(f"  Added column {column}")
    settings = get_settings()
    with SessionLocal() as db:
        # Default sectors only for a tier that has none yet, so sectors the admin removed stay removed.
        for tier, sectors in SECTORS.items():
            if db.scalar(select(Sector.id).where(Sector.tier == tier).limit(1)) is None:
                db.add_all(Sector(name=name, icon=icon, tier=tier) for name, icon in sectors)
        # The owner (ADMIN_EMAIL) is the super admin; scripts/create_admin.py adds more admins.
        admin_email = settings.admin_email.lower()
        owner = db.scalar(select(User).where(User.email == admin_email))
        if owner is None:
            _user(
                db,
                admin_email,
                name="Solara Owner",
                role="admin",
                is_super_admin=True,
                onboarded=True,
                password_hash=hash_password(settings.admin_password),
                details={},
            )
        elif owner.role == "admin" and not owner.is_super_admin:
            owner.is_super_admin = True
        if demo:
            db.flush()
            normal_hirer, premium_hirer = _demo_users(db)
            db.flush()
            _demo_jobs(db, normal_hirer, premium_hirer)
        db.commit()

    print("Seed complete.")
    print(f"  Admin:           {settings.admin_email} / (ADMIN_PASSWORD)")
    if demo:
        print(f"  Normal worker:   seeker@solara.app or 9876543210 / {DEMO_PASSWORD}")
        print(f"  Premium worker:  doctor@solara.app or 9876543211 / {DEMO_PASSWORD}")
        print(f"  Normal hirer:    hirer@solara.app or 9876500001 / {DEMO_PASSWORD}")
        print(f"  Premium hirer:   hospital@solara.app or 9876500002 / {DEMO_PASSWORD}")


if __name__ == "__main__":
    seed(demo="--demo" in sys.argv, reset="--reset" in sys.argv)
