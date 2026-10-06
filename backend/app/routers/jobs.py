from fastapi import APIRouter, Depends, File, HTTPException, Query, UploadFile, status
from sqlalchemy import func, or_, select
from sqlalchemy.orm import Session

from app.database import get_db
from app.deps import ensure_onboarded, get_current_user, get_or_404, require_role
from app.models import Application, Job, JobPhoto, SavedJob, Sector, User
from app.responses import ok
from app.schemas.jobs import JobIn
from app.serializers import job_dict
from app.services.activity import notify
from app.services.storage import delete_file, save_image

router = APIRouter(prefix="/jobs", tags=["jobs"])

MAX_PHOTOS = 6


def _saved_ids(db: Session, user: User) -> set[int]:
    return set(db.scalars(select(SavedJob.job_id).where(SavedJob.user_id == user.id)))


def _applied(db: Session, user: User) -> dict[int, int]:
    rows = db.execute(select(Application.job_id, Application.id).where(Application.seeker_id == user.id))
    return {job_id: app_id for job_id, app_id in rows}


def _seeker_job(job: Job, saved: set[int], applied: dict[int, int]) -> dict:
    return job_dict(job, saved=job.id in saved, myApplicationId=applied.get(job.id))


def _own_job(db: Session, job_id: int, user: User) -> Job:
    job = get_or_404(db, Job, job_id, "Job")
    if job.hirer_id != user.id:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Job not found")
    return job


# ── Job seeker ───────────────────────────────────────────────────────────────


@router.get("/get-all-jobs")
def get_all_jobs(
    sector_id: int | None = Query(None, alias="sectorId"),
    q: str | None = Query(None, max_length=60),
    city: str | None = Query(None, max_length=60),
    user: User = Depends(require_role("seeker")),
    db: Session = Depends(get_db),
):
    # A seeker only ever sees jobs posted by hirers of the same tier.
    query = (
        select(Job)
        .where(Job.status == "active", Job.tier == user.tier)
        .order_by(Job.created_at.desc())
        .limit(200)
    )
    if sector_id:
        query = query.where(Job.sector_id == sector_id)
    if city:
        query = query.where(func.lower(Job.city) == city.strip().lower())
    if q:
        pattern = f"%{q.strip().lower()}%"
        query = query.where(or_(func.lower(Job.title).like(pattern), func.lower(Job.description).like(pattern)))
    saved, applied = _saved_ids(db, user), _applied(db, user)
    return ok(jobs=[_seeker_job(job, saved, applied) for job in db.scalars(query).unique()])


@router.get("/get-job/{job_id}")
def get_job(job_id: int, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    job = get_or_404(db, Job, job_id, "Job")
    if user.role == "seeker":
        applied = _applied(db, user)
        if job.tier != user.tier:
            raise HTTPException(status.HTTP_404_NOT_FOUND, "Job not found")
        if job.status != "active" and job.id not in applied:
            raise HTTPException(status.HTTP_404_NOT_FOUND, "This job is no longer available")
        return ok(job=_seeker_job(job, _saved_ids(db, user), applied))
    if user.role == "hirer" and job.hirer_id != user.id:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Job not found")
    count = db.scalar(select(func.count(Application.id)).where(Application.job_id == job.id))
    return ok(job=job_dict(job, applicantCount=count))


@router.post("/save-job/{job_id}")
def save_job(job_id: int, user: User = Depends(require_role("seeker")), db: Session = Depends(get_db)):
    job = get_or_404(db, Job, job_id, "Job")
    if job.status != "active" or job.tier != user.tier:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "This job is no longer available")
    if job.id not in _saved_ids(db, user):
        db.add(SavedJob(user_id=user.id, job_id=job.id))
        db.commit()
    return ok("Job saved")


@router.delete("/unsave-job/{job_id}")
def unsave_job(job_id: int, user: User = Depends(require_role("seeker")), db: Session = Depends(get_db)):
    saved = db.scalar(select(SavedJob).where(SavedJob.user_id == user.id, SavedJob.job_id == job_id))
    if saved:
        db.delete(saved)
        db.commit()
    return ok("Removed from saved jobs")


@router.get("/get-saved-jobs")
def get_saved_jobs(user: User = Depends(require_role("seeker")), db: Session = Depends(get_db)):
    jobs = db.scalars(
        select(Job)
        .join(SavedJob, SavedJob.job_id == Job.id)
        .where(SavedJob.user_id == user.id, Job.status == "active")
        .order_by(SavedJob.created_at.desc())
    ).unique()
    applied = _applied(db, user)
    return ok(jobs=[job_dict(job, saved=True, myApplicationId=applied.get(job.id)) for job in jobs])


# ── Hirer ────────────────────────────────────────────────────────────────────


@router.post("/add-job", status_code=status.HTTP_201_CREATED)
def add_job(body: JobIn, user: User = Depends(require_role("hirer")), db: Session = Depends(get_db)):
    ensure_onboarded(user)
    if user.verification_status != "verified":
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Your identity must be verified before you post jobs")

    sector: Sector | None = None
    if body.sector_id is not None:
        sector = get_or_404(db, Sector, body.sector_id, "Sector")
        if sector.tier != user.tier:
            raise HTTPException(status.HTTP_400_BAD_REQUEST, "Choose a sector from your own list")
    else:
        # A "new" sector that already exists in this tier (any letter case) is simply used.
        sector = db.scalar(
            select(Sector).where(func.lower(Sector.name) == body.proposed_sector.lower(), Sector.tier == user.tier)
        )

    premium = user.tier == "premium"
    skills = [skill.strip().replace(",", " ") for skill in body.required_skills or [] if skill.strip()]
    job = Job(
        **body.model_dump(
            exclude={"sector_id", "proposed_sector", "employment_type", "min_experience", "qualification", "required_skills"}
        ),
        hirer_id=user.id,
        tier=user.tier,
        sector_id=sector.id if sector else None,
        proposed_sector=None if sector else body.proposed_sector,
        status="active" if sector else "pending_review",
        employment_type=body.employment_type if premium else None,
        min_experience=body.min_experience if premium else None,
        qualification=(body.qualification or None) if premium else None,
        required_skills=(",".join(dict.fromkeys(skills)) or None) if premium else None,
    )
    db.add(job)
    db.flush()
    if job.status == "pending_review":
        for admin_id in db.scalars(select(User.id).where(User.role == "admin")):
            notify(db, admin_id, "Job waiting for review", f'"{job.title}" suggests a new sector: {job.proposed_sector}.')
    db.commit()
    db.refresh(job)
    message = "Job posted" if job.status == "active" else "Job submitted. It goes live once the new sector is approved."
    return ok(message, job=job_dict(job, applicantCount=0))


@router.post("/upload-photos/{job_id}")
async def upload_photos(
    job_id: int,
    photos: list[UploadFile] = File(...),
    user: User = Depends(require_role("hirer")),
    db: Session = Depends(get_db),
):
    job = _own_job(db, job_id, user)
    if not 1 <= len(photos) <= MAX_PHOTOS:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, f"Upload between 1 and {MAX_PHOTOS} photos")
    paths = [await save_image(db, photo, "jobs") for photo in photos]
    for old in job.photos:
        delete_file(db, old.path)
    job.photos = [JobPhoto(path=path) for path in paths]
    db.commit()
    return ok("Photos uploaded", job=job_dict(job))


@router.get("/get-my-jobs")
def get_my_jobs(user: User = Depends(require_role("hirer")), db: Session = Depends(get_db)):
    counts = dict(
        db.execute(
            select(Application.job_id, func.count(Application.id))
            .join(Job, Job.id == Application.job_id)
            .where(Job.hirer_id == user.id)
            .group_by(Application.job_id)
        ).all()
    )
    unseen = dict(
        db.execute(
            select(Application.job_id, func.count(Application.id))
            .join(Job, Job.id == Application.job_id)
            .where(Job.hirer_id == user.id, Application.seen_by_hirer.is_(False))
            .group_by(Application.job_id)
        ).all()
    )
    jobs = db.scalars(select(Job).where(Job.hirer_id == user.id).order_by(Job.created_at.desc())).unique()
    return ok(
        jobs=[job_dict(job, applicantCount=counts.get(job.id, 0), newApplicants=unseen.get(job.id, 0)) for job in jobs]
    )


@router.put("/close-job/{job_id}")
def close_job(job_id: int, user: User = Depends(require_role("hirer")), db: Session = Depends(get_db)):
    job = _own_job(db, job_id, user)
    if job.status not in ("active", "pending_review"):
        raise HTTPException(status.HTTP_409_CONFLICT, "Only open jobs can be closed")
    job.status = "closed"
    db.commit()
    return ok("Job closed", job=job_dict(job))
