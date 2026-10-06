"""Importing this package registers every table on Base.metadata."""

from app.models.activity import (
    AuditLog,
    Conversation,
    Message,
    Notification,
    PasswordResetOtp,
    Report,
    SupportTicket,
)
from app.models.file import StoredFile
from app.models.job import Application, Job, JobPhoto, SavedJob, Sector
from app.models.translation import Translation
from app.models.user import User

__all__ = [
    "Application",
    "AuditLog",
    "Conversation",
    "Job",
    "JobPhoto",
    "Message",
    "Notification",
    "PasswordResetOtp",
    "Report",
    "SavedJob",
    "Sector",
    "StoredFile",
    "SupportTicket",
    "Translation",
    "User",
]
