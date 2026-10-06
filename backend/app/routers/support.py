from fastapi import APIRouter, Depends, status
from sqlalchemy import func, select, update
from sqlalchemy.orm import Session

from app.database import get_db
from app.deps import get_current_user, get_or_404, require_role
from app.models import Job, Notification, Report, SupportTicket, User
from app.responses import ok
from app.schemas.jobs import ReportIn, TicketIn
from app.serializers import notification_dict

router = APIRouter(tags=["support"])

FAQS = [
    {
        "id": 1,
        "question": "Do I have to pay to use Solara?",
        "answer": "No. Solara is always free for job seekers. Never pay anyone to apply for a job. "
        "Report such requests from the job page.",
    },
    {
        "id": 2,
        "question": 'What does the "Verified" badge mean?',
        "answer": "The hirer has verified their identity with Aadhaar and our team has reviewed it. "
        "You can see the badge on every job they post.",
    },
    {
        "id": 3,
        "question": "Who can see my phone number?",
        "answer": 'Only hirers you apply to, and only if you turn on "Share my phone number" for that '
        "application. Otherwise they contact you through in-app messages.",
    },
    {
        "id": 4,
        "question": "How is my Aadhaar kept safe?",
        "answer": "We only ask for the last four digits and a photo for verification. The full number is "
        "never shown in the app, and documents can only be opened by our verification team.",
    },
    {
        "id": 6,
        "question": "What is the difference between Normal and Premium?",
        "answer": "Normal is for daily-wage and household work such as construction, house help and driving: "
        "sign-up only needs your photo and Aadhaar. Premium is for professionals such as doctors and engineers, "
        "with a detailed profile. Each side only sees its own jobs, and both are free.",
    },
    {
        "id": 5,
        "question": "Why is my job waiting for review?",
        "answer": "When you suggest a new sector, our team checks it before the job goes live. "
        "Jobs in existing sectors are published straight away.",
    },
]


# ── Notifications ────────────────────────────────────────────────────────────


@router.get("/notifications/get-all-notifications")
def get_all_notifications(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    items = db.scalars(
        select(Notification).where(Notification.user_id == user.id).order_by(Notification.id.desc()).limit(100)
    )
    unread = db.scalar(
        select(func.count(Notification.id)).where(Notification.user_id == user.id, Notification.read.is_(False))
    )
    return ok(notifications=[notification_dict(item) for item in items], unread=unread)


@router.put("/notifications/mark-all-read")
def mark_all_read(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    db.execute(update(Notification).where(Notification.user_id == user.id).values(read=True))
    db.commit()
    return ok("All notifications marked as read")


# ── Help & reports ───────────────────────────────────────────────────────────


@router.get("/support/get-all-faqs")
def get_all_faqs(_: User = Depends(get_current_user)):
    return ok(faqs=FAQS)


@router.post("/support/add-ticket", status_code=status.HTTP_201_CREATED)
def add_ticket(body: TicketIn, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    db.add(SupportTicket(user_id=user.id, **body.model_dump()))
    db.commit()
    return ok("Thanks! Our team will reply by email within 2 working days.")


@router.post("/support/add-report", status_code=status.HTTP_201_CREATED)
def add_report(
    body: ReportIn, user: User = Depends(require_role("seeker", "hirer")), db: Session = Depends(get_db)
):
    get_or_404(db, Job if body.target_type == "job" else User, body.target_id, body.target_type.capitalize())
    db.add(Report(reporter_id=user.id, **body.model_dump()))
    db.commit()
    return ok("Report sent. Our team will look into it.")
