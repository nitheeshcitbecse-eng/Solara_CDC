from typing import Literal

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import func, or_, select
from sqlalchemy.orm import Session

from app.database import get_db
from app.deps import get_or_404, require_role, require_super_admin
from app.models import Application, AuditLog, Job, Report, Sector, User
from app.responses import ok
from app.schemas.admin import (
    AdminIn,
    AdminStatusIn,
    ResolveReportIn,
    ReviewJobIn,
    ReviewShortlistIn,
    TakeDownJobIn,
    UserStatusIn,
    VerifyUserIn,
)
from app.serializers import admin_user_dict, application_dict, audit_dict, job_dict, report_dict
from app.security import hash_password
from app.services.activity import audit, notify
from app.services.storage import image_response

router = APIRouter(prefix="/admin", tags=["admin"])

admin_only = require_role("admin")

Tier = Literal["normal", "premium"]


def _count(db: Session, model, *conditions) -> int:
    return db.scalar(select(func.count(model.id)).where(*conditions)) or 0


@router.get("/get-dashboard-stats")
def get_dashboard_stats(_: User = Depends(admin_only), db: Session = Depends(get_db)):
    def tier_stats(tier: str) -> dict:
        return {
            "seekers": _count(db, User, User.role == "seeker", User.tier == tier),
            "hirers": _count(db, User, User.role == "hirer", User.tier == tier),
            "activeJobs": _count(db, Job, Job.status == "active", Job.tier == tier),
        }

    return ok(
        stats={
            "seekers": _count(db, User, User.role == "seeker"),
            "hirers": _count(db, User, User.role == "hirer"),
            "activeJobs": _count(db, Job, Job.status == "active"),
            "normal": tier_stats("normal"),
            "premium": tier_stats("premium"),
            "pendingJobs": _count(db, Job, Job.status == "pending_review"),
            "pendingShortlists": _count(db, Application, Application.contact_status == "pending"),
            "pendingVerifications": _count(db, User, User.verification_status == "pending"),
            "openReports": _count(db, Report, Report.status == "open"),
            "applications": _count(db, Application),
        }
    )


# ── Users ────────────────────────────────────────────────────────────────────


@router.get("/get-all-users")
def get_all_users(
    role: Literal["seeker", "hirer"] | None = None,
    tier: Tier | None = None,
    q: str | None = Query(None, max_length=60),
    _: User = Depends(admin_only),
    db: Session = Depends(get_db),
):
    query = select(User).where(User.role != "admin").order_by(User.created_at.desc()).limit(300)
    if role:
        query = query.where(User.role == role)
    if tier:
        query = query.where(User.tier == tier)
    if q:
        pattern = f"%{q.strip().lower()}%"
        query = query.where(or_(func.lower(User.name).like(pattern), func.lower(User.email).like(pattern)))
    return ok(users=[admin_user_dict(user) for user in db.scalars(query)])


@router.get("/get-user/{user_id}")
def get_user(user_id: int, _: User = Depends(admin_only), db: Session = Depends(get_db)):
    user = get_or_404(db, User, user_id, "User")
    stats = (
        {"jobs": _count(db, Job, Job.hirer_id == user.id)}
        if user.role == "hirer"
        else {"applications": _count(db, Application, Application.seeker_id == user.id)}
    )
    return ok(user=admin_user_dict(user), stats=stats)


@router.put("/update-user-status/{user_id}")
def update_user_status(
    user_id: int, body: UserStatusIn, admin: User = Depends(admin_only), db: Session = Depends(get_db)
):
    user = get_or_404(db, User, user_id, "User")
    if user.role == "admin":
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Admin accounts can't be changed here")
    user.status = body.status
    user.status_reason = body.reason
    if body.status != "active":
        user.token_version += 1  # signs the user out everywhere
    audit(db, admin, f"user_{body.status}", f"user:{user.id}", body.reason)
    db.commit()
    return ok(f"User is now {body.status}", user=admin_user_dict(user))


@router.get("/get-pending-verifications")
def get_pending_verifications(_: User = Depends(admin_only), db: Session = Depends(get_db)):
    users = db.scalars(select(User).where(User.verification_status == "pending").order_by(User.created_at))
    return ok(users=[admin_user_dict(user) for user in users])


@router.put("/verify-user/{user_id}")
def verify_user(user_id: int, body: VerifyUserIn, admin: User = Depends(admin_only), db: Session = Depends(get_db)):
    user = get_or_404(db, User, user_id, "User")
    if user.role == "admin" or user.verification_status != "pending":
        raise HTTPException(status.HTTP_409_CONFLICT, "This user has no documents waiting for review")
    user.verification_status = body.decision
    user.verification_note = body.reason
    if body.decision == "verified":
        body_text = "You can now post jobs on Solara." if user.role == "hirer" else "Hirers will see a verified badge."
        notify(db, user.id, "You are verified", body_text)
    else:
        notify(db, user.id, "Verification rejected", f"Reason: {body.reason}. Please upload your Aadhaar again.")
    audit(db, admin, f"user_{body.decision}", f"user:{user.id}", body.reason)
    db.commit()
    return ok(f"User {body.decision}", user=admin_user_dict(user))


@router.get("/get-document/{user_id}/{side}")
def get_document(
    user_id: int, side: Literal["front", "back"], admin: User = Depends(admin_only), db: Session = Depends(get_db)
):
    user = get_or_404(db, User, user_id, "User")
    path = user.aadhaar_front_path if side == "front" else user.aadhaar_back_path
    response = image_response(db, path, "no-store", missing="Document not found")
    audit(db, admin, "view_document", f"user:{user.id}", side)
    db.commit()
    return response


# ── Jobs ─────────────────────────────────────────────────────────────────────


@router.get("/get-all-jobs")
def get_all_jobs(
    status_filter: Literal["active", "pending_review", "rejected", "closed", "taken_down"] | None = Query(
        None, alias="status"
    ),
    tier: Tier | None = None,
    _: User = Depends(admin_only),
    db: Session = Depends(get_db),
):
    query = select(Job).order_by(Job.created_at.desc()).limit(300)
    if status_filter:
        query = query.where(Job.status == status_filter)
    if tier:
        query = query.where(Job.tier == tier)
    return ok(jobs=[job_dict(job) for job in db.scalars(query).unique()])


@router.put("/review-job/{job_id}")
def review_job(job_id: int, body: ReviewJobIn, admin: User = Depends(admin_only), db: Session = Depends(get_db)):
    job = get_or_404(db, Job, job_id, "Job")
    if job.status != "pending_review":
        raise HTTPException(status.HTTP_409_CONFLICT, "This job isn't waiting for review")

    if body.decision == "approve":
        if job.proposed_sector:
            sector = db.scalar(
                select(Sector).where(func.lower(Sector.name) == job.proposed_sector.lower(), Sector.tier == job.tier)
            )
            if sector is None:
                sector = Sector(name=job.proposed_sector, tier=job.tier)
                db.add(sector)
                db.flush()
            job.sector_id = sector.id
            job.proposed_sector = None
        job.status = "active"
        job.review_note = None
        notify(db, job.hirer_id, "Job approved", f'"{job.title}" is now live.')
    else:
        job.status = "rejected"
        job.review_note = body.reason
        notify(db, job.hirer_id, "Job rejected", f'"{job.title}": {body.reason}')
    audit(db, admin, f"job_{body.decision}", f"job:{job.id}", body.reason)
    db.commit()
    db.refresh(job)
    return ok(f"Job {'approved' if body.decision == 'approve' else 'rejected'}", job=job_dict(job))


@router.put("/take-down-job/{job_id}")
def take_down_job(job_id: int, body: TakeDownJobIn, admin: User = Depends(admin_only), db: Session = Depends(get_db)):
    job = get_or_404(db, Job, job_id, "Job")
    if job.status in ("taken_down", "closed"):
        raise HTTPException(status.HTTP_409_CONFLICT, f"This job is already {job.status.replace('_', ' ')}")
    job.status = "taken_down"
    job.review_note = body.reason
    notify(db, job.hirer_id, "Job taken down", f'"{job.title}": {body.reason}')
    audit(db, admin, "job_take_down", f"job:{job.id}", body.reason)
    db.commit()
    return ok("Job taken down", job=job_dict(job))


# ── Premium shortlists (contact details) ─────────────────────────────────────


@router.get("/get-shortlist-requests")
def get_shortlist_requests(
    status_filter: Literal["pending", "approved", "rejected"] = Query("pending", alias="status"),
    _: User = Depends(admin_only),
    db: Session = Depends(get_db),
):
    apps = db.scalars(
        select(Application)
        .where(Application.contact_status == status_filter)
        .order_by(Application.created_at.desc())
        .limit(300)
    ).unique()
    return ok(requests=[application_dict(app, for_hirer=True) for app in apps])


@router.put("/review-shortlist/{application_id}")
def review_shortlist(
    application_id: int, body: ReviewShortlistIn, admin: User = Depends(admin_only), db: Session = Depends(get_db)
):
    app = get_or_404(db, Application, application_id, "Application")
    if app.contact_status != "pending":
        raise HTTPException(status.HTTP_409_CONFLICT, "This shortlist isn't waiting for approval")
    hirer = app.job.hirer
    seeker = app.seeker
    if body.decision == "approve":
        app.contact_status = "approved"
        app.contact_note = None
        notify(db, hirer.id, "Contact details unlocked", f"You can now call or message {seeker.name} about {app.job.title}.")
        notify(db, seeker.id, "Your contact details were shared", f"{hirer.business_name or hirer.name} can now contact you about {app.job.title}.")
    else:
        app.contact_status = "rejected"
        app.contact_note = body.note
        notify(db, hirer.id, "Shortlist not approved", f"{seeker.name} for {app.job.title}: {body.note}")
    audit(db, admin, f"shortlist_{body.decision}", f"application:{app.id}", body.note)
    db.commit()
    message = "Shortlist approved. Contact details shared." if body.decision == "approve" else "Shortlist rejected"
    return ok(message, request=application_dict(app, for_hirer=True))


# ── Reports & audit ──────────────────────────────────────────────────────────


@router.get("/get-all-reports")
def get_all_reports(
    status_filter: Literal["open", "resolved", "dismissed"] | None = Query(None, alias="status"),
    _: User = Depends(admin_only),
    db: Session = Depends(get_db),
):
    query = select(Report).order_by(Report.created_at.desc()).limit(300)
    if status_filter:
        query = query.where(Report.status == status_filter)
    return ok(reports=[report_dict(report) for report in db.scalars(query).unique()])


@router.put("/resolve-report/{report_id}")
def resolve_report(
    report_id: int, body: ResolveReportIn, admin: User = Depends(admin_only), db: Session = Depends(get_db)
):
    report = get_or_404(db, Report, report_id, "Report")
    if report.status != "open":
        raise HTTPException(status.HTTP_409_CONFLICT, "This report is already closed")
    report.status = body.status
    report.note = body.note
    audit(db, admin, f"report_{body.status}", f"report:{report.id}", body.note)
    db.commit()
    return ok(f"Report {body.status}", report=report_dict(report))


@router.get("/get-audit-logs")
def get_audit_logs(_: User = Depends(require_super_admin), db: Session = Depends(get_db)):
    logs = db.scalars(select(AuditLog).order_by(AuditLog.id.desc()).limit(200)).unique()
    return ok(logs=[audit_dict(log) for log in logs])


# ── Admins (super admin only) ────────────────────────────────────────────────


@router.get("/get-admins")
def get_admins(_: User = Depends(require_super_admin), db: Session = Depends(get_db)):
    admins = db.scalars(select(User).where(User.role == "admin").order_by(User.is_super_admin.desc(), User.created_at))
    return ok(admins=[admin_user_dict(admin) for admin in admins])


@router.post("/add-admin", status_code=status.HTTP_201_CREATED)
def add_admin(body: AdminIn, owner: User = Depends(require_super_admin), db: Session = Depends(get_db)):
    email = body.email.lower()
    if db.scalar(select(User.id).where(User.email == email)) is not None:
        raise HTTPException(status.HTTP_409_CONFLICT, "An account with this email already exists")
    admin = User(name=body.name, email=email, role="admin", onboarded=True, password_hash=hash_password(body.password), details={})
    db.add(admin)
    db.flush()
    audit(db, owner, "admin_added", f"user:{admin.id}", email)
    db.commit()
    return ok("Admin added", admin=admin_user_dict(admin))


@router.put("/update-admin-status/{user_id}")
def update_admin_status(
    user_id: int, body: AdminStatusIn, owner: User = Depends(require_super_admin), db: Session = Depends(get_db)
):
    admin = get_or_404(db, User, user_id, "Admin")
    if admin.role != "admin":
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Admin not found")
    if admin.is_super_admin:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "The super admin can't be removed")
    admin.status = body.status
    if body.status != "active":
        admin.token_version += 1  # signs them out everywhere
    audit(db, owner, f"admin_{body.status}", f"user:{admin.id}", admin.email)
    db.commit()
    return ok("Admin removed" if body.status == "banned" else "Admin restored", admin=admin_user_dict(admin))
