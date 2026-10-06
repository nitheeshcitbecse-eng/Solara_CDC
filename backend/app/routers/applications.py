from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.database import get_db
from app.deps import ensure_onboarded, get_current_user, get_or_404, require_role
from app.models import Application, Job, User
from app.responses import ok
from app.schemas.jobs import ApplicationIn, ApplicationStatusIn
from app.serializers import application_dict
from app.services.activity import notify
from app.services.contact import is_premium

router = APIRouter(prefix="/applications", tags=["applications"])

ALLOWED_TRANSITIONS = {
    "applied": ("shortlisted", "hired", "rejected"),
    "shortlisted": ("hired", "rejected"),
    "hired": (),
    "rejected": (),
}

STATUS_TEXT = {
    "shortlisted": "You have been shortlisted",
    "hired": "Congratulations, you are hired",
    "rejected": "Your application was not selected",
}


def _visible_application(db: Session, application_id: int, user: User) -> Application:
    app = get_or_404(db, Application, application_id, "Application")
    if user.role == "seeker" and app.seeker_id == user.id:
        return app
    if user.role == "hirer" and app.job.hirer_id == user.id:
        return app
    if user.role == "admin":
        return app
    raise HTTPException(status.HTTP_404_NOT_FOUND, "Application not found")


@router.post("/add-application", status_code=status.HTTP_201_CREATED)
def add_application(body: ApplicationIn, user: User = Depends(require_role("seeker")), db: Session = Depends(get_db)):
    ensure_onboarded(user)
    job = get_or_404(db, Job, body.job_id, "Job")
    if job.status != "active" or job.tier != user.tier:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "This job is no longer available")
    exists = db.scalar(select(Application.id).where(Application.job_id == job.id, Application.seeker_id == user.id))
    if exists:
        raise HTTPException(status.HTTP_409_CONFLICT, "You have already applied for this job")

    app = Application(**body.model_dump(), seeker_id=user.id)
    db.add(app)
    notify(db, job.hirer_id, "New applicant", f"{user.name} applied for {job.title}.")
    db.commit()
    db.refresh(app)
    return ok("Application submitted", application=application_dict(app))


@router.get("/get-my-applications")
def get_my_applications(user: User = Depends(require_role("seeker")), db: Session = Depends(get_db)):
    apps = db.scalars(
        select(Application).where(Application.seeker_id == user.id).order_by(Application.created_at.desc())
    ).unique()
    return ok(applications=[application_dict(app) for app in apps])


@router.get("/get-application/{application_id}")
def get_application(application_id: int, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    app = _visible_application(db, application_id, user)
    is_hirer = user.role in ("hirer", "admin")
    if user.role == "hirer" and not app.seen_by_hirer:
        app.seen_by_hirer = True
        db.commit()
    return ok(application=application_dict(app, for_hirer=is_hirer))


@router.get("/get-job-applicants/{job_id}")
def get_job_applicants(job_id: int, user: User = Depends(require_role("hirer")), db: Session = Depends(get_db)):
    job = get_or_404(db, Job, job_id, "Job")
    if job.hirer_id != user.id:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Job not found")
    apps = db.scalars(
        select(Application).where(Application.job_id == job.id).order_by(Application.created_at.desc())
    ).unique()
    return ok(applications=[application_dict(app, for_hirer=True) for app in apps])


@router.put("/update-status/{application_id}")
def update_status(
    application_id: int,
    body: ApplicationStatusIn,
    user: User = Depends(require_role("hirer")),
    db: Session = Depends(get_db),
):
    app = _visible_application(db, application_id, user)
    if body.status not in ALLOWED_TRANSITIONS[app.status]:
        raise HTTPException(status.HTTP_409_CONFLICT, f"A {app.status} application can't be marked {body.status}")
    app.status = body.status
    app.seen_by_hirer = True
    notify(db, app.seeker_id, STATUS_TEXT[body.status], f"Update on your application for {app.job.title}.")

    message = f"Applicant marked {body.status}"
    if is_premium(app) and body.status in ("shortlisted", "hired") and app.contact_status == "none":
        # The owner checks every premium shortlist before contact details are shared.
        app.contact_status = "pending"
        org = user.business_name or user.name
        for admin_id in db.scalars(select(User.id).where(User.role == "admin")):
            notify(
                db,
                admin_id,
                "Shortlist waiting for approval",
                f"{org} {body.status} {app.seeker.name} for {app.job.title}. Approve to share contact details.",
            )
        message += ". Solara will verify the shortlist before sharing contact details."
    db.commit()
    return ok(message, application=application_dict(app, for_hirer=True))
