from typing import Literal

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.database import get_db
from app.deps import get_current_user, get_or_404, require_role
from app.models import Job, Sector, User
from app.responses import ok
from app.schemas.jobs import SectorIn
from app.serializers import sector_dict
from app.services.activity import audit

router = APIRouter(prefix="/sectors", tags=["sectors"])


@router.get("/get-all-sectors")
def get_all_sectors(
    tier: Literal["normal", "premium"] | None = None,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    # Seekers and hirers only ever see the sectors of their own tier.
    tier = tier if user.role == "admin" else user.tier
    active_jobs = (
        select(Job.sector_id, func.count(Job.id).label("count"))
        .where(Job.status == "active")
        .group_by(Job.sector_id)
        .subquery()
    )
    query = (
        select(Sector, func.coalesce(active_jobs.c.count, 0))
        .outerjoin(active_jobs, active_jobs.c.sector_id == Sector.id)
        .order_by(Sector.tier, Sector.name)
    )
    if tier:
        query = query.where(Sector.tier == tier)
    return ok(sectors=[sector_dict(sector, count) for sector, count in db.execute(query).all()])


@router.post("/add-sector", status_code=status.HTTP_201_CREATED)
def add_sector(body: SectorIn, admin: User = Depends(require_role("admin")), db: Session = Depends(get_db)):
    exists = db.scalar(select(Sector).where(func.lower(Sector.name) == body.name.lower(), Sector.tier == body.tier))
    if exists:
        raise HTTPException(status.HTTP_409_CONFLICT, f"This {body.tier} sector already exists")
    sector = Sector(name=body.name, icon=body.icon or "work", tier=body.tier)
    db.add(sector)
    db.flush()
    audit(db, admin, "add_sector", f"sector:{sector.id}", f"{sector.name} ({sector.tier})")
    db.commit()
    return ok("Sector added", sector=sector_dict(sector, 0))


@router.delete("/delete-sector/{sector_id}")
def delete_sector(sector_id: int, admin: User = Depends(require_role("admin")), db: Session = Depends(get_db)):
    sector = get_or_404(db, Sector, sector_id, "Sector")
    if db.scalar(select(func.count(Job.id)).where(Job.sector_id == sector.id)):
        raise HTTPException(status.HTTP_409_CONFLICT, "This sector has jobs and can't be removed")
    audit(db, admin, "delete_sector", f"sector:{sector.id}", f"{sector.name} ({sector.tier})")
    db.delete(sector)
    db.commit()
    return ok("Sector removed")
