"""Turns database rows into the camelCase JSON the app reads. `id` is the primary key."""

from datetime import date, datetime
from typing import Any

from pydantic.alias_generators import to_camel

from app.models import (
    Application,
    AuditLog,
    Conversation,
    Job,
    Notification,
    Report,
    Sector,
    User,
)


def iso(value: datetime | date | None) -> str | None:
    return value.isoformat() if value else None


def csv_list(value: str | None) -> list[str]:
    return [item for item in (value or "").split(",") if item]


def details_dict(user: User) -> dict[str, Any]:
    return {to_camel(key): value for key, value in (user.details or {}).items()}


def user_dict(user: User) -> dict[str, Any]:
    """The signed-in user's own data (never includes file paths or the password hash)."""
    return {
        "id": user.id,
        "name": user.name,
        "email": user.email,
        "phone": user.phone,
        "role": user.role,
        "isSuperAdmin": user.role == "admin" and user.is_super_admin,
        "tier": user.tier,
        "status": user.status,
        "onboarded": user.role == "admin" or user.onboarded,
        "hasPhoto": bool(user.photo_path),
        "city": user.city,
        "about": user.about,
        "skills": csv_list(user.skills),
        "experienceYears": user.experience_years,
        "businessName": user.business_name,
        "details": details_dict(user),
        "verificationStatus": user.verification_status,
        "verificationNote": user.verification_note,
        "aadhaarLast4": user.aadhaar_last4,
        "hasAadhaar": bool(user.aadhaar_front_path),
        "createdAt": iso(user.created_at),
    }


def admin_user_dict(user: User) -> dict[str, Any]:
    return {
        **user_dict(user),
        "statusReason": user.status_reason,
        "hasAadhaarFront": bool(user.aadhaar_front_path),
        "hasAadhaarBack": bool(user.aadhaar_back_path),
    }


def hirer_public(user: User) -> dict[str, Any]:
    return {
        "id": user.id,
        "name": user.name,
        "businessName": user.business_name,
        "verified": user.verification_status == "verified",
        "organizationType": (user.details or {}).get("organization_type"),
    }


def sector_dict(sector: Sector, job_count: int | None = None) -> dict[str, Any]:
    data = {"id": sector.id, "name": sector.name, "icon": sector.icon, "tier": sector.tier}
    if job_count is not None:
        data["jobCount"] = job_count
    return data


def job_dict(job: Job, **extra: Any) -> dict[str, Any]:
    return {
        "id": job.id,
        "title": job.title,
        "description": job.description,
        "tier": job.tier,
        "sector": sector_dict(job.sector) if job.sector else None,
        "proposedSector": job.proposed_sector,
        "city": job.city,
        "address": job.address,
        "salaryMin": job.salary_min,
        "salaryMax": job.salary_max,
        "salaryPeriod": job.salary_period,
        "shift": job.shift,
        "openings": job.openings,
        "employmentType": job.employment_type,
        "minExperience": job.min_experience,
        "qualification": job.qualification,
        "requiredSkills": csv_list(job.required_skills),
        "status": job.status,
        "reviewNote": job.review_note,
        "photos": [f"/uploads/{photo.path}" for photo in job.photos],
        "hirer": hirer_public(job.hirer),
        "createdAt": iso(job.created_at),
        **extra,
    }


def seeker_for_hirer(seeker: User, share_phone: bool, premium_unlocked: bool | None = None) -> dict[str, Any]:
    """premium_unlocked is None for normal applications, True/False for premium ones."""
    if premium_unlocked is None:
        phone, email = (seeker.phone if share_phone else None), None
    else:
        phone, email = (seeker.phone, seeker.email) if premium_unlocked else (None, None)
    return {
        "id": seeker.id,
        "name": seeker.name,
        "tier": seeker.tier,
        "city": seeker.city,
        "about": seeker.about,
        "skills": csv_list(seeker.skills),
        "experienceYears": seeker.experience_years,
        "details": details_dict(seeker),
        "hasPhoto": bool(seeker.photo_path),
        "verified": seeker.verification_status == "verified",
        # Normal: shown when the seeker shares it. Premium: only after the owner approves the shortlist.
        "phone": phone,
        "email": email,
    }


def application_dict(app: Application, for_hirer: bool = False) -> dict[str, Any]:
    data: dict[str, Any] = {
        "id": app.id,
        "status": app.status,
        "message": app.message,
        "expectedSalary": app.expected_salary,
        "availableFrom": iso(app.available_from),
        "sharePhone": app.share_phone,
        "createdAt": iso(app.created_at),
        "job": job_dict(app.job),
        "contactStatus": app.contact_status if app.job.tier == "premium" else None,
        "contactNote": app.contact_note,
        "canChat": app.job.tier != "premium" or app.contact_status == "approved",
    }
    if for_hirer:
        premium_unlocked = (app.contact_status == "approved") if app.job.tier == "premium" else None
        data["seeker"] = seeker_for_hirer(app.seeker, app.share_phone, premium_unlocked)
        data["seen"] = app.seen_by_hirer
    return data


def conversation_dict(conv: Conversation, viewer: User, last_message: Any, unread: int) -> dict[str, Any]:
    other = conv.hirer if viewer.id == conv.seeker_id else conv.seeker
    # Seekers see the hirer's business name when there is one.
    other_name = (other.business_name or other.name) if other.role == "hirer" else other.name
    return {
        "id": conv.id,
        "applicationId": conv.application_id,
        "jobTitle": conv.application.job.title,
        "otherUser": {"id": other.id, "name": other_name, "role": other.role, "hasPhoto": bool(other.photo_path)},
        "lastMessage": last_message.text if last_message else None,
        "lastMessageAt": iso(last_message.created_at) if last_message else iso(conv.created_at),
        "unread": unread,
    }


def notification_dict(item: Notification) -> dict[str, Any]:
    return {"id": item.id, "title": item.title, "body": item.body, "read": item.read, "createdAt": iso(item.created_at)}


def report_dict(report: Report) -> dict[str, Any]:
    return {
        "id": report.id,
        "targetType": report.target_type,
        "targetId": report.target_id,
        "reason": report.reason,
        "details": report.details,
        "status": report.status,
        "note": report.note,
        "reporter": {"id": report.reporter.id, "name": report.reporter.name},
        "createdAt": iso(report.created_at),
    }


def audit_dict(log: AuditLog) -> dict[str, Any]:
    return {
        "id": log.id,
        "action": log.action,
        "target": log.target,
        "details": log.details,
        "admin": log.admin.name,
        "createdAt": iso(log.created_at),
    }
