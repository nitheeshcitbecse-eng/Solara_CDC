import pytest

from app.config import get_settings
from tests.conftest import API


@pytest.fixture
def translator(monkeypatch):
    """Stands in for the NLLB-200 service and records what the backend asked it."""
    calls: list[tuple[list[str], str]] = []

    def fake(texts, language):
        calls.append((list(texts), language))
        return [f"[{language}] {text}" for text in texts]

    monkeypatch.setattr("app.services.translation.call_translator", fake)
    return calls


def test_languages_are_public(client):
    body = client.get(f"{API}/i18n/get-languages").json()
    assert body["success"] and body["source"] == "eng_Latn"
    codes = [language["code"] for language in body["languages"]]
    assert {"eng_Latn", "hin_Deva", "tam_Taml"} <= set(codes)


def test_translations_are_cached_in_the_database(client, translator):
    first = client.post(f"{API}/i18n/translate", json={"language": "tam_Taml", "texts": ["Find work", "Login", "Find work"]})
    assert first.status_code == 200
    assert first.json()["translations"] == {"Find work": "[tam_Taml] Find work", "Login": "[tam_Taml] Login"}
    assert translator == [(["Find work", "Login"], "tam_Taml")]

    # Only the new text goes to the translator; the others come from the cache.
    second = client.post(f"{API}/i18n/translate", json={"language": "tam_Taml", "texts": ["Login", "Apply now"]})
    assert second.json()["translations"] == {"Login": "[tam_Taml] Login", "Apply now": "[tam_Taml] Apply now"}
    assert translator[1:] == [(["Apply now"], "tam_Taml")]

    # Each language has its own cache.
    client.post(f"{API}/i18n/translate", json={"language": "hin_Deva", "texts": ["Login"]})
    assert translator[2:] == [(["Login"], "hin_Deva")]


def test_english_needs_no_translator(client, translator):
    body = client.post(f"{API}/i18n/translate", json={"language": "eng_Latn", "texts": ["Login"]}).json()
    assert body["translations"] == {"Login": "Login"}
    assert translator == []


def test_unknown_language_is_rejected(client, translator):
    response = client.post(f"{API}/i18n/translate", json={"language": "xyz_Latn", "texts": ["Login"]})
    assert response.status_code == 422
    assert response.json() == {"success": False, "message": "This language is not available"}


def test_translator_offline_gives_a_clear_error(client, monkeypatch):
    monkeypatch.setattr(get_settings(), "translator_url", "http://127.0.0.1:9")
    monkeypatch.setattr(get_settings(), "translator_timeout", 2.0)
    response = client.post(f"{API}/i18n/translate", json={"language": "tam_Taml", "texts": ["Login"]})
    assert response.status_code == 503
    assert response.json() == {"success": False, "message": "The translation service is not available right now"}


def test_english_users_get_indian_script_text_translated(client, translator):
    body = client.post(f"{API}/i18n/translate", json={"language": "eng_Latn", "texts": ["Login", "வீட்டு வேலை"]}).json()
    assert body["translations"] == {"Login": "Login", "வீட்டு வேலை": "[eng_Latn] வீட்டு வேலை"}
    assert translator == [(["வீட்டு வேலை"], "eng_Latn")]


# ── Translator clients (HTTP faked) ──────────────────────────────────────────


class FakeResponse:
    def __init__(self, status_code, body):
        self.status_code = status_code
        self._body = body

    def json(self):
        return self._body


@pytest.fixture
def http(monkeypatch):
    """Records outgoing translator requests; `http.reply` decides the answer."""

    class Recorder:
        calls: list[dict] = []

        @staticmethod
        def reply(url, params, json):
            if "microsofttranslator" in url:
                return FakeResponse(200, [{"translations": [{"text": f"{params['to']}:{item['Text']}"}]} for item in json])
            return FakeResponse(200, {"success": True, "translations": [f"{json['source']}>{json['target']}:{t}" for t in json["texts"]]})

    def fake_post(url, params=None, headers=None, json=None, timeout=None):
        Recorder.calls.append({"url": url, "params": params or {}, "headers": headers or {}, "json": json})
        return Recorder.reply(url, params or {}, json)

    monkeypatch.setattr("app.services.translation.httpx.post", fake_post)
    return Recorder


def test_azure_is_used_when_a_key_is_set(client, http, monkeypatch):
    monkeypatch.setattr(get_settings(), "azure_translator_key", "test-key")
    monkeypatch.setattr(get_settings(), "azure_translator_region", "centralindia")
    body = client.post(f"{API}/i18n/translate", json={"language": "hin_Deva", "texts": ["Find work", "வீட்டு வேலை", "Login"]}).json()

    assert body["translations"] == {"Find work": "hi:Find work", "வீட்டு வேலை": "hi:வீட்டு வேலை", "Login": "hi:Login"}
    english, detected = http.calls
    assert english["params"]["from"] == "en" and english["params"]["to"] == "hi"
    assert [item["Text"] for item in english["json"]] == ["Find work", "Login"]
    assert "from" not in detected["params"]  # Azure detects the language of typed Tamil
    assert english["headers"] == {"Ocp-Apim-Subscription-Key": "test-key", "Ocp-Apim-Subscription-Region": "centralindia"}


def test_azure_free_quota_used_up(client, http, monkeypatch):
    monkeypatch.setattr(get_settings(), "azure_translator_key", "test-key")
    http.reply = staticmethod(lambda url, params, json: FakeResponse(403, {"error": {"code": 403001, "message": "Out of call volume quota"}}))
    response = client.post(f"{API}/i18n/translate", json={"language": "tam_Taml", "texts": ["Login"]})
    assert response.status_code == 503
    assert response.json()["message"] == "This month's free translation limit has been reached"


def test_nllb_is_told_the_language_of_typed_text(client, http):
    body = client.post(f"{API}/i18n/translate", json={"language": "tam_Taml", "texts": ["Login", "घर का काम", "வீட்டு வேலை"]}).json()
    assert body["translations"] == {
        "Login": "eng_Latn>tam_Taml:Login",
        "घर का काम": "hin_Deva>tam_Taml:घर का काम",
        "வீட்டு வேலை": "வீட்டு வேலை",  # already Tamil
    }
    assert [(call["json"]["source"], call["json"]["texts"]) for call in http.calls] == [("eng_Latn", ["Login"]), ("hin_Deva", ["घर का काम"])]
