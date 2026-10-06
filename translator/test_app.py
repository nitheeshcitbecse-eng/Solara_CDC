"""Fast tests with a stand-in engine (no model download):  .venv\\Scripts\\python -m pytest -q"""

import os

os.environ["NLLB_SKIP_LOAD"] = "1"

import pytest  # noqa: E402
from fastapi.testclient import TestClient  # noqa: E402

import app as service  # noqa: E402


@pytest.fixture
def client():
    with TestClient(service.app) as test_client:
        yield test_client


@pytest.fixture
def ready(monkeypatch):
    monkeypatch.setattr(service.engine, "model", object())
    monkeypatch.setattr(service.engine, "supports", lambda code: code in {"eng_Latn", "tam_Taml"})
    monkeypatch.setattr(service.engine, "translate", lambda texts, source, target: [f"{target}:{text}" for text in texts])


def test_loading_model_answers_503(client):
    assert client.get("/health").json()["status"] == "loading"
    response = client.post("/translate", json={"texts": ["Login"], "target": "tam_Taml"})
    assert response.status_code == 503
    assert response.json() == {"success": False, "message": "The translation model is still loading"}


def test_translates_in_order(client, ready):
    response = client.post("/translate", json={"texts": ["Login", "Find work"], "target": "tam_Taml"})
    assert response.json() == {"success": True, "translations": ["tam_Taml:Login", "tam_Taml:Find work"]}
    assert client.get("/health").json()["status"] == "ready"


def test_rejects_unknown_language(client, ready):
    response = client.post("/translate", json={"texts": ["Login"], "target": "abc_Latn"})
    assert response.status_code == 400
    assert response.json()["message"] == "Unsupported language code: abc_Latn"


def test_validates_request(client, ready):
    response = client.post("/translate", json={"texts": [], "target": "tam_Taml"})
    assert response.status_code == 422
    assert response.json()["success"] is False
