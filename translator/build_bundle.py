"""Translates the app's own interface texts into every language and saves them inside the app.

    cd translator
    .venv\\Scripts\\python build_bundle.py            # all languages
    .venv\\Scripts\\python build_bundle.py tam_Taml   # one language

Reads ../frontend/src/i18n/strings.json (made by frontend/scripts/collect-ui-strings.js) and writes
../frontend/src/i18n/<language>.json. The app shows these instantly and offline; only texts that are not
in the bundle (job posts, messages, names…) are translated live.

Short labels are ambiguous for a translation model ("Job" became the Bible's Job, "Hire" became "rent"),
so HINTS sends a clearer English phrase in their place, and KEEP lists texts that must stay as written.
"""

import json
import re
import sys
import time
from pathlib import Path

import torch

from app import Engine, MODEL_NAME

I18N = Path(__file__).resolve().parents[1] / "frontend" / "src" / "i18n"
LANGUAGES = ["hin_Deva", "tam_Taml", "tel_Telu", "kan_Knda", "mal_Mlym", "ben_Beng", "mar_Deva", "guj_Gujr", "pan_Guru", "ory_Orya", "asm_Beng"]
SUFFIX = re.compile(r"(\s*[*:…?]+)$")  # "Your photo *", "Note:", "Log out?" — keep the marker exactly

# Names, places, examples and codes: shown as written in every language.
KEEP = {
    "Adyar", "Chennai", "Chennai, Bengaluru", "e.g. Chennai", "e.g. Chennai, Bengaluru", "Arun Home Services",
    "Madras Medical College", "Sunrise Multispeciality Hospital", "React", "Solara", "Solara · v1.0", "https://",
    "9876543210 or you@email.com", "MBBS, MD", "e.g. 1200000", "e.g. 2016", "e.g. 3", "e.g. 4821", "e.g. 5",
    "e.g. Priya", "1_month", "A", "D", "L", "M", "P", "S",
}

# English sent to the model in place of an ambiguous label (the app still looks up the original).
HINTS = {
    "Hire": "hire workers", "Hire professionals": "hire professionals", "Hired": "hired for the job",
    "Hirer": "employer", "Hirers": "employers", "Normal hirers": "normal employers", "Premium hirers": "premium employers",
    "Workers & hirers": "workers and employers", "Message Hirer": "send a message to the employer",
    "Shared with hirer": "shared with the employer",
    "Job": "job", "Jobs": "jobs", "All Jobs": "all jobs", "All jobs": "all jobs", "My Jobs": "my jobs", "Your jobs": "your jobs",
    "Apply": "apply for the job", "Apply Now": "apply for the job now", "Applied": "applied for the job",
    "Applied on": "date of application", "Application": "job application", "Applications": "job applications",
    "My Applications": "my job applications", "Your application": "your job application",
    "View My Application": "view my job application", "Applicant": "job applicant", "Applicants": "job applicants",
    "Post Work": "post a job", "Post work": "post a job", "Post Job": "post a job", "Post a Job": "post a job",
    "Post a job": "post a job", "Post an Opening": "post a job opening", "Post an opening": "post a job opening",
    "Posted": "posted on", "Jobs posted": "jobs posted", "Publish Opening": "publish the job opening",
    "Openings": "job openings", "Browse Openings": "browse job openings", "Your openings": "your job openings",
    "Openings you saved": "job openings you saved", "Openings & candidates": "job openings and candidates",
    "Recommended openings": "recommended job openings",
    "Close": "close it", "Close Job": "close the job posting", "Close a Job": "close a job posting",
    "Close a job": "close a job posting", "Close an Opening": "close a job opening", "Close an opening": "close a job opening",
    "Close this job?": "close this job posting?", "Closed": "closed",
    "Open": "still open", "open": "still open", "Open reports": "reports still open",
    "Saved": "saved", "Saved Jobs": "saved jobs",
    "Shortlist": "add to shortlist", "Shortlisted": "selected for shortlist", "Shortlists": "shortlisted candidates",
    "Shortlist Approvals": "approval of shortlisted candidates",
    "Login": "log in", "Logout": "log out", "Log out?": "log out?", "Not you? Logout": "not you? log out",
    "Back": "go back", "Back side": "back side of the card", "Front side *": "front side of the card *",
    "Ban": "ban the user", "Banned": "banned", "Suspend": "suspend the account", "Suspended": "account suspended",
    "Activate": "activate the account", "Active": "active", "active": "active",
    "Remove": "remove", "Restore": "restore", "Resolve": "resolve the complaint", "Resolved": "resolved",
    "Dismiss": "dismiss the complaint", "Dismissed": "dismissed", "Review": "review", "Approve": "approve",
    "Approved": "approved", "Reject": "reject", "Rejected": "rejected", "Pending": "pending", "Waiting": "waiting",
    "Verify": "verify the user", "Verified": "verified",
    "Worker": "worker", "Workers": "workers", "Job Seeker": "job seeker", "Job seeker": "job seeker",
    "Call": "phone call", "Message": "message", "Chat": "chat", "Contact": "contact details",
    "Day": "day shift", "Night": "night shift", "Flexible": "flexible timing", "Shift": "work shift",
    "Size": "organisation size", "Type": "type", "Status": "status", "Step": "step", "Total": "total", "Today": "today",
    "New": "new", "new": "new", "Note": "note", "Other": "other", "Optional": "optional", "Done": "done",
    "Finish": "finish", "Cancel": "cancel", "Retake": "take the photo again", "Camera": "camera", "Gallery": "photo gallery",
    "Work": "work", "Your work": "your work", "Find Work": "find work", "Daily Work": "daily wage work",
    "Daily work": "daily wage work", "Daily Workers": "daily wage workers", "Find daily work": "find daily wage work",
    "Live jobs": "jobs that are live", "Take Down": "remove the job post", "Taken Down": "removed by admin",
    "Take Down Jobs": "remove job posts", "Take down jobs": "remove job posts",
    "Joined": "joined on", "Can start": "can start working", "Startup": "startup company",
    "Sector": "job sector", "Sectors": "job sectors", "Sector *": "job sector *", "Sector name": "job sector name",
    "Add Sector": "add a job sector", "Add sector": "add a job sector", "Remove Sector": "remove a job sector",
    "Remove sector": "remove a job sector", "Remove sector?": "remove this job sector?", "View sectors": "view job sectors",
    "Search sectors": "search job sectors", "Choose a sector": "choose a job sector", "New sector name": "new job sector name",
    "+ New sector": "+ new job sector",
    "Basics": "basic details", "Requirements": "job requirements", "Experience": "work experience",
    "Admin": "administrator", "Admins": "administrators", "Add admin": "add an administrator",
    "Add an admin": "add an administrator", "Admin accounts": "administrator accounts", "Remove admin": "remove administrator",
    "Restore admin": "restore administrator", "Super admin": "super administrator", "SUPER ADMIN": "super administrator",
    "ADMIN CONSOLE": "administrator console", "Owner · Admin": "owner · administrator",
    "Premium": "premium", "PREMIUM": "premium", "Normal": "normal", "NORMAL": "normal",
    "Icon": "icon", "Unlocked": "unlocked", "Hidden": "hidden", "Verifications": "identity verifications",
    "To verify": "to be verified", "To review": "to be reviewed", "Moderate Jobs": "check job posts",
    "Review Jobs": "review job posts", "Review jobs": "review job posts", "Jobs to review": "job posts to review",
}


def model_text(text: str) -> str:
    """What the model is asked to translate for `text` (a clearer phrase for short Title Case labels)."""
    if text in HINTS:
        return HINTS[text]
    words = text.split()
    # "Edit Profile" → "edit profile": capitalised words read like names to the model.
    if len(words) <= 3 and all(word[:1].isupper() and word[1:].islower() for word in words if word.isalpha()):
        return " ".join(word.lower() if word.isalpha() else word for word in words)
    return text


def main() -> None:
    texts = json.loads((I18N / "strings.json").read_text(encoding="utf-8"))
    targets = sys.argv[1:] or LANGUAGES
    torch.set_num_threads(max(1, torch.get_num_threads()))
    engine = Engine(MODEL_NAME)
    engine.load()
    if engine.error:
        sys.exit(engine.error)

    jobs = []  # (original, text for the model, suffix to put back)
    for text in texts:
        if text in KEEP:
            continue
        hinted = model_text(text)
        match = SUFFIX.search(hinted)
        suffix = SUFFIX.search(text).group(1) if SUFFIX.search(text) else ""
        jobs.append((text, hinted[: match.start()] if match else hinted, suffix))
    # Similar lengths together: far less padding, so much faster on a CPU.
    jobs.sort(key=lambda job: len(job[1]))

    for language in targets:
        started = time.time()
        output = engine.translate([job[1] for job in jobs], "eng_Latn", language)
        bundle = {text: text for text in KEEP if text in texts}
        for (text, core, suffix), translated in zip(jobs, output, strict=True):
            translated = translated.strip().rstrip("?.:*").strip() if suffix else translated.strip()
            # Leave out empty or runaway results; the app then translates that text live.
            if translated and len(translated) <= max(40, len(core) * 4):
                bundle[text] = translated + suffix
        path = I18N / f"{language}.json"
        path.write_text(json.dumps(bundle, ensure_ascii=False, indent=0, sort_keys=True) + "\n", encoding="utf-8")
        print(f"{language}: {len(bundle)}/{len(texts)} texts in {time.time() - started:.0f}s", flush=True)


if __name__ == "__main__":
    main()
