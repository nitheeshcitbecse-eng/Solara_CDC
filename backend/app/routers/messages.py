from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import func, or_, select, update
from sqlalchemy.orm import Session

from app.database import get_db, utcnow
from app.deps import get_or_404, require_role
from app.models import Application, Conversation, Message, User
from app.responses import ok
from app.schemas.jobs import MessageIn
from app.serializers import conversation_dict, iso
from app.services.activity import notify
from app.services.contact import can_chat

router = APIRouter(prefix="/messages", tags=["messages"])

participant = require_role("seeker", "hirer")


def _own_conversation(db: Session, conversation_id: int, user: User) -> Conversation:
    conv = get_or_404(db, Conversation, conversation_id, "Conversation")
    if user.id not in (conv.seeker_id, conv.hirer_id):
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Conversation not found")
    return conv


def _summary(db: Session, conv: Conversation, user: User) -> dict:
    last = db.scalar(
        select(Message).where(Message.conversation_id == conv.id).order_by(Message.id.desc()).limit(1)
    )
    unread = db.scalar(
        select(func.count(Message.id)).where(
            Message.conversation_id == conv.id, Message.sender_id != user.id, Message.read_at.is_(None)
        )
    )
    return conversation_dict(conv, user, last, unread)


def _message_dict(message: Message, user: User) -> dict:
    return {"id": message.id, "text": message.text, "mine": message.sender_id == user.id, "createdAt": iso(message.created_at)}


@router.get("/get-all-conversations")
def get_all_conversations(user: User = Depends(participant), db: Session = Depends(get_db)):
    convs = db.scalars(
        select(Conversation).where(or_(Conversation.seeker_id == user.id, Conversation.hirer_id == user.id))
    ).unique()
    items = [_summary(db, conv, user) for conv in convs]
    items.sort(key=lambda item: item["lastMessageAt"] or "", reverse=True)
    return ok(conversations=items)


@router.post("/open-conversation/{application_id}")
def open_conversation(application_id: int, user: User = Depends(participant), db: Session = Depends(get_db)):
    app = get_or_404(db, Application, application_id, "Application")
    if user.id not in (app.seeker_id, app.job.hirer_id):
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Application not found")
    if not can_chat(app):
        raise HTTPException(
            status.HTTP_403_FORBIDDEN, "Messaging opens after Solara approves this shortlist"
        )
    conv = db.scalar(select(Conversation).where(Conversation.application_id == app.id))
    if conv is None:
        conv = Conversation(application_id=app.id, seeker_id=app.seeker_id, hirer_id=app.job.hirer_id)
        db.add(conv)
        db.commit()
        db.refresh(conv)
    return ok(conversation=_summary(db, conv, user))


@router.get("/get-messages/{conversation_id}")
def get_messages(conversation_id: int, user: User = Depends(participant), db: Session = Depends(get_db)):
    conv = _own_conversation(db, conversation_id, user)
    db.execute(
        update(Message)
        .where(Message.conversation_id == conv.id, Message.sender_id != user.id, Message.read_at.is_(None))
        .values(read_at=utcnow())
    )
    db.commit()
    messages = db.scalars(select(Message).where(Message.conversation_id == conv.id).order_by(Message.id))
    return ok(conversation=_summary(db, conv, user), messages=[_message_dict(m, user) for m in messages])


@router.post("/send-message/{conversation_id}", status_code=status.HTTP_201_CREATED)
def send_message(
    conversation_id: int, body: MessageIn, user: User = Depends(participant), db: Session = Depends(get_db)
):
    conv = _own_conversation(db, conversation_id, user)
    if not can_chat(conv.application):
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Messaging is not available for this application")
    message = Message(conversation_id=conv.id, sender_id=user.id, text=body.text)
    db.add(message)
    other_id = conv.hirer_id if user.id == conv.seeker_id else conv.seeker_id
    notify(db, other_id, f"New message from {user.name}", body.text[:120])
    db.commit()
    return ok(message=_message_dict(message, user))
