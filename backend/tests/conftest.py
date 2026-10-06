import os
import tempfile
from itertools import count
from pathlib import Path

import pytest

# Point the app at a throwaway SQLite database and upload folder BEFORE importing it.
_tmp = Path(tempfile.mkdtemp(prefix="solara-tests-"))
os.environ["DATABASE_URL"] = f"sqlite:///{_tmp / 'test.db'}"
os.environ["UPLOAD_DIR"] = str(_tmp / "uploads")
os.environ["JWT_SECRET"] = "test-secret-with-enough-length-1234567890"

from fastapi.testclient import TestClient  # noqa: E402

from app.database import Base, engine  # noqa: E402
from app.main import app  # noqa: E402
from app.seed import seed  # noqa: E402

API = "/api/v1"
# A real (tiny) JPEG: uploads are decoded and re-encoded, so the bytes must be a valid image.
def _jpeg() -> bytes:
    from io import BytesIO

    from PIL import Image

    out = BytesIO()
    Image.new("RGB", (8, 8), "orange").save(out, "JPEG")
    return out.getvalue()


JPEG = _jpeg()
_phones = count(9000000001)


@pytest.fixture
def client():
    Base.metadata.drop_all(engine)
    seed(demo=True)
    with TestClient(app) as test_client:
        yield test_client


@pytest.fixture
def emails(monkeypatch):
    sent: list[tuple[str, str, str]] = []
    monkeypatch.setattr("app.routers.auth.send_email", lambda to, subject, body: sent.append((to, subject, body)))
    return sent


def auth(token: str) -> dict:
    return {"Authorization": f"Bearer {token}"}


def login(client: TestClient, identifier: str, password: str = "Demo@1234") -> dict:
    response = client.post(f"{API}/auth/login", json={"identifier": identifier, "password": password})
    assert response.status_code == 200, response.json()
    return auth(response.json()["token"])


def register(client: TestClient, role: str, tier: str = "normal", email: str | None = None, **extra) -> dict:
    body = {"name": "Test User", "phone": str(next(_phones)), "password": "Secret@123", "role": role, "tier": tier}
    if email:
        body["email"] = email
    body.update(extra)
    response = client.post(f"{API}/auth/register", json=body)
    assert response.status_code == 201, response.json()
    return auth(response.json()["token"])


def upload_documents(client: TestClient, headers: dict) -> dict:
    response = client.post(
        f"{API}/onboarding/upload-documents",
        headers=headers,
        data={"last4": "1234"},
        files={"photo": ("me.jpg", JPEG, "image/jpeg"), "aadhaarFront": ("front.jpg", JPEG, "image/jpeg")},
    )
    assert response.status_code == 200, response.json()
    return response.json()


def onboard(client: TestClient, headers: dict) -> None:
    """Completes onboarding for a NORMAL user (photo + Aadhaar)."""
    upload_documents(client, headers)
    response = client.post(f"{API}/onboarding/complete", headers=headers)
    assert response.status_code == 200, response.json()
