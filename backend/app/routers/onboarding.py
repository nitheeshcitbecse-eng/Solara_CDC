from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile, status
from sqlalchemy import or_, select
from sqlalchemy.orm import Session

from app.database import get_db
from app.deps import get_current_user, get_or_404, require_role
from app.models import Application, Job, User
from app.responses import ok
from app.serializers import user_dict
from app.services.activity import notify
from app.services.onboarding import missing_items
from app.services.storage import delete_file, image_response, save_image

router = APIRouter(tags=["onboarding"])

participant = require_role("seeker", "hirer")


@router.post("/onboarding/upload-documents")
async def upload_documents(
    photo: UploadFile | None = File(None),
    aadhaar_front: UploadFile | None = File(None, alias="aadhaarFront"),
    aadhaar_back: UploadFile | None = File(None, alias="aadhaarBack"),
    last4: str | None = Form(None, pattern=r"^\d{4}$"),
    user: User = Depends(participant),
    db: Session = Depends(get_db),
):
    """Saves the user's own photo and/or Aadhaar photos. Any subset can be sent."""
    if not (photo or aadhaar_front or aadhaar_back):
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Add at least one photo")
    if (aadhaar_front or aadhaar_back) and user.verification_status == "verified":
        raise HTTPException(status.HTTP_409_CONFLICT, "Your Aadhaar is already verified")

    if photo:
        new_path = await save_image(db, photo, "profiles")
        delete_file(db, user.photo_path)
        user.photo_path = new_path

    if aadhaar_front or aadhaar_back:
        if aadhaar_front:
            front_path = await save_image(db, aadhaar_front, "aadhaar")
            delete_file(db, user.aadhaar_front_path)
            user.aadhaar_front_path = front_path
        if aadhaar_back:
            back_path = await save_image(db, aadhaar_back, "aadhaar")
            delete_file(db, user.aadhaar_back_path)
            user.aadhaar_back_path = back_path
        if last4:
            user.aadhaar_last4 = last4
        newly_submitted = user.verification_status in ("none", "rejected")
        user.verification_status = "pending"
        user.verification_note = None
        if newly_submitted:
            for admin_id in db.scalars(select(User.id).where(User.role == "admin")):
                notify(db, admin_id, "New verification request", f"{user.business_name or user.name} uploaded Aadhaar.")

    db.commit()
    return ok("Photos saved", user=user_dict(user))


@router.post("/onboarding/complete")
def complete_onboarding(user: User = Depends(participant), db: Session = Depends(get_db)):
    missing = missing_items(user)
    if missing:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Please add " + ", ".join(missing))
    user.onboarded = True
    db.commit()
    return ok("Welcome to Solara!", user=user_dict(user))


def _can_see_photo(db: Session, viewer: User, target: User) -> bool:
    """Profile photos are visible to the person, admins, and the other side of an application."""
    if viewer.id == target.id or viewer.role == "admin":
        return True
    pair = (
        select(Application.id)
        .join(Job, Job.id == Application.job_id)
        .where(
            or_(
                (Application.seeker_id == target.id) & (Job.hirer_id == viewer.id),
                (Application.seeker_id == viewer.id) & (Job.hirer_id == target.id),
            )
        )
        .limit(1)
    )
    return db.scalar(pair) is not None


@router.get("/users/get-photo/{user_id}")
def get_photo(user_id: int, viewer: User = Depends(get_current_user), db: Session = Depends(get_db)):
    target = get_or_404(db, User, user_id, "User")
    if not target.photo_path or not _can_see_photo(db, viewer, target):
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Photo not found")
    return image_response(db, target.photo_path, "private, max-age=300")
