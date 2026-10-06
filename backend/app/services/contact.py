"""Who may see a job seeker's contact details and chat with them.

Normal (daily-wage) applications: no extra checks; the phone is shown when the seeker chose to share it.
Premium applications: the owner must approve the shortlist first. Until then the hirer sees no phone
or email and nobody can open a chat for that application.
"""

from app.models import Application


def is_premium(app: Application) -> bool:
    return app.job.tier == "premium"


def contact_unlocked(app: Application) -> bool:
    return not is_premium(app) or app.contact_status == "approved"


def can_chat(app: Application) -> bool:
    return contact_unlocked(app)
