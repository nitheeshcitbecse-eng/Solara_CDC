"""What each kind of user must provide before they can use the app."""

from app.models import User

# Normal users answer almost nothing: a photo of themselves and of their Aadhaar card.
BASE_REQUIREMENTS = [
    ("photo_path", "your photo"),
    ("aadhaar_front_path", "a photo of your Aadhaar card"),
]

PREMIUM_SEEKER_FIELDS = [("profession", "profession"), ("qualification", "qualification"), ("languages", "languages")]
PREMIUM_HIRER_FIELDS = [
    ("organization_type", "organisation type"),
    ("designation", "your designation"),
    ("company_size", "organisation size"),
    ("office_address", "office address"),
]


def missing_items(user: User) -> list[str]:
    """Human-readable list of what is still missing; empty when onboarding can be completed."""
    if user.role == "admin":
        return []
    missing = [label for field, label in BASE_REQUIREMENTS if not getattr(user, field)]
    if user.tier != "premium":
        return missing

    details = user.details or {}
    if user.role == "seeker":
        missing += [label for key, label in PREMIUM_SEEKER_FIELDS if not details.get(key)]
        if user.experience_years is None:
            missing.append("years of experience")
        if not user.skills:
            missing.append("skills")
    else:
        if not user.business_name:
            missing.append("organisation name")
        missing += [label for key, label in PREMIUM_HIRER_FIELDS if not details.get(key)]
    if not user.city:
        missing.append("city")
    return missing
