"""Records real API responses for the frontend screen tests.

    cd backend
    .venv\\Scripts\\python scripts\\export_app_fixtures.py

Seeds a throwaway SQLite database with the demo data, creates some activity (applications,
shortlists, a chat, a report, a pending verification…) and saves every GET response the app reads,
per kind of user, to ../frontend/__tests__/fixtures.json.
"""

import json
import os
import sys
import tempfile
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

_tmp = Path(tempfile.mkdtemp(prefix="solara-fixtures-"))
os.environ["DATABASE_URL"] = f"sqlite:///{_tmp / 'fixtures.db'}"
os.environ["UPLOAD_DIR"] = str(_tmp / "uploads")
os.environ["JWT_SECRET"] = "fixtures-secret-0123456789abcdefghij"

from fastapi.testclient import TestClient  # noqa: E402

from app.main import app  # noqa: E402
from app.seed import seed  # noqa: E402

API = "/api/v1"
def _jpeg() -> bytes:
    from io import BytesIO

    from PIL import Image

    out = BytesIO()
    Image.new("RGB", (8, 8), "orange").save(out, "JPEG")
    return out.getvalue()


JPEG = _jpeg()  # uploads are re-encoded, so this must be a real image
OUT = ROOT.parent / "frontend" / "__tests__" / "fixtures.json"


def main() -> None:
    seed(demo=True, reset=True)
    client = TestClient(app)

    def login(identifier, password="Demo@1234"):
        token = client.post(f"{API}/auth/login", json={"identifier": identifier, "password": password}).json()["token"]
        return {"Authorization": f"Bearer {token}"}

    def ok(response):
        assert response.status_code < 300, response.json()
        return response.json()

    users = {
        "normalSeeker": login("seeker@solara.app"),
        "premiumSeeker": login("doctor@solara.app"),
        "normalHirer": login("hirer@solara.app"),
        "premiumHirer": login("hospital@solara.app"),
        "admin": login("owner@solara.app", "Solara@123"),
    }
    s, d, h, p, a = (users[key] for key in ("normalSeeker", "premiumSeeker", "normalHirer", "premiumHirer", "admin"))

    # ── Activity so every screen has something to show ──────────────────────
    normal_jobs = ok(client.get(f"{API}/jobs/get-all-jobs", headers=s))["jobs"]
    premium_jobs = ok(client.get(f"{API}/jobs/get-all-jobs", headers=d))["jobs"]

    normal_app = ok(client.post(f"{API}/applications/add-application", headers=s, json={
        "jobId": normal_jobs[0]["id"], "message": "I have done this work for five years and can start tomorrow.", "sharePhone": True,
        "expectedSalary": 800, "availableFrom": "2026-11-01",
    }))["application"]["id"]
    ok(client.post(f"{API}/applications/add-application", headers=s, json={
        "jobId": normal_jobs[1]["id"], "message": "Looking for a steady job close to home, available mornings.",
    }))
    ok(client.put(f"{API}/applications/update-status/{normal_app}", headers=h, json={"status": "shortlisted"}))
    conversation = ok(client.post(f"{API}/messages/open-conversation/{normal_app}", headers=h))["conversation"]["id"]
    ok(client.post(f"{API}/messages/send-message/{conversation}", headers=h, json={"text": "Can you come to the site on Monday at 9?"}))
    ok(client.post(f"{API}/messages/send-message/{conversation}", headers=s, json={"text": "Yes sir, I will be there."}))
    ok(client.post(f"{API}/jobs/save-job/{normal_jobs[2]['id']}", headers=s))

    premium_app = ok(client.post(f"{API}/applications/add-application", headers=d, json={
        "jobId": premium_jobs[0]["id"], "message": "Six years in emergency and general medicine, MD from Chennai.",
        "expectedSalary": 2200000,
    }))["application"]["id"]
    ok(client.put(f"{API}/applications/update-status/{premium_app}", headers=p, json={"status": "shortlisted"}))
    ok(client.post(f"{API}/jobs/save-job/{premium_jobs[1]['id']}", headers=d))

    # A new hirer waiting for verification, a job waiting for review, a report.
    newbie = ok(client.post(f"{API}/auth/register", json={
        "name": "Lakshmi Traders", "phone": "9123400001", "password": "Secret@123", "role": "hirer", "tier": "normal",
    }))["token"]
    newbie = {"Authorization": f"Bearer {newbie}"}
    ok(client.post(f"{API}/onboarding/upload-documents", headers=newbie, data={"last4": "7788"},
                   files={"photo": ("me.jpg", JPEG, "image/jpeg"), "aadhaarFront": ("front.jpg", JPEG, "image/jpeg")}))
    ok(client.post(f"{API}/onboarding/complete", headers=newbie))
    ok(client.post(f"{API}/jobs/add-job", headers=h, json={
        "title": "Gardener for apartment complex", "description": "Water plants, trim hedges and keep the lawn tidy every morning.",
        "city": "Chennai", "salaryMin": 600, "salaryMax": 700, "salaryPeriod": "day", "proposedSector": "Gardening",
    }))
    ok(client.post(f"{API}/support/add-report", headers=s, json={
        "targetType": "job", "targetId": normal_jobs[1]["id"], "reason": "misleading", "details": "Salary is different on the phone.",
    }))

    # ── Record every GET the app makes ───────────────────────────────────────
    fixtures = {}

    def record(role, paths):
        headers = users[role]
        responses = {}
        for path in paths:
            response = client.get(f"{API}{path}", headers=headers)
            responses[path] = {"status": response.status_code, "data": response.json()}
        profile = responses["/auth/profile"]["data"]["user"]
        fixtures[role] = {"user": profile, "responses": responses}

    common = ["/auth/profile", "/notifications/get-all-notifications", "/messages/get-all-conversations", "/support/get-all-faqs", "/sectors/get-all-sectors"]

    for role in ("normalSeeker", "premiumSeeker"):
        headers = users[role]
        jobs = ok(client.get(f"{API}/jobs/get-all-jobs", headers=headers))["jobs"]
        apps = ok(client.get(f"{API}/applications/get-my-applications", headers=headers))["applications"]
        convs = ok(client.get(f"{API}/messages/get-all-conversations", headers=headers))["conversations"]
        record(role, common + ["/jobs/get-all-jobs", "/jobs/get-saved-jobs", "/applications/get-my-applications"]
               + [f"/jobs/get-job/{job['id']}" for job in jobs]
               + [f"/jobs/get-job/{app_['job']['id']}" for app_ in apps]
               + [f"/applications/get-application/{app_['id']}" for app_ in apps]
               + [f"/messages/get-messages/{conv['id']}" for conv in convs])

    for role in ("normalHirer", "premiumHirer"):
        headers = users[role]
        jobs = ok(client.get(f"{API}/jobs/get-my-jobs", headers=headers))["jobs"]
        applicants = []
        for job in jobs:
            applicants += ok(client.get(f"{API}/applications/get-job-applicants/{job['id']}", headers=headers))["applications"]
        convs = ok(client.get(f"{API}/messages/get-all-conversations", headers=headers))["conversations"]
        record(role, common + ["/jobs/get-my-jobs"]
               + [f"/applications/get-job-applicants/{job['id']}" for job in jobs]
               + [f"/applications/get-application/{item['id']}" for item in applicants]
               + [f"/messages/get-messages/{conv['id']}" for conv in convs])

    admin_users = ok(client.get(f"{API}/admin/get-all-users", headers=a))["users"]
    record("admin", ["/auth/profile", "/notifications/get-all-notifications", "/support/get-all-faqs", "/sectors/get-all-sectors",
                     "/admin/get-dashboard-stats", "/admin/get-all-users", "/admin/get-pending-verifications", "/admin/get-all-jobs",
                     "/admin/get-all-reports", "/admin/get-audit-logs", "/admin/get-shortlist-requests"]
           + [f"/admin/get-user/{user['id']}" for user in admin_users])

    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(json.dumps(fixtures, indent=1), encoding="utf-8")
    counts = {role: len(value["responses"]) for role, value in fixtures.items()}
    print("Wrote", OUT, counts)


if __name__ == "__main__":
    main()
