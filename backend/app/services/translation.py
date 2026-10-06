"""Translations for the app. PostgreSQL caches what the translator produced.

The backend is the only client of the translator and the only one that touches the database: the
translator never sees the database, and the app never talks to the translator.

Translator: Azure AI Translator when AZURE_TRANSLATOR_KEY is set (free F0 tier, 2M characters a month,
never billed), otherwise the local NLLB-200 service at TRANSLATOR_URL (../translator).
"""

import hashlib
import re

import httpx
from fastapi import HTTPException
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.config import get_settings
from app.models import Translation

SOURCE_LANGUAGE = "eng_Latn"

# App codes are FLORES-200 codes (NLLB); `azure` is the same language in Azure's codes.
# Right-to-left scripts such as Urdu are left out until the app supports RTL.
LANGUAGES = [
    {"code": "eng_Latn", "name": "English", "nativeName": "English", "azure": "en"},
    {"code": "hin_Deva", "name": "Hindi", "nativeName": "हिन्दी", "azure": "hi"},
    {"code": "tam_Taml", "name": "Tamil", "nativeName": "தமிழ்", "azure": "ta"},
    {"code": "tel_Telu", "name": "Telugu", "nativeName": "తెలుగు", "azure": "te"},
    {"code": "kan_Knda", "name": "Kannada", "nativeName": "ಕನ್ನಡ", "azure": "kn"},
    {"code": "mal_Mlym", "name": "Malayalam", "nativeName": "മലയാളം", "azure": "ml"},
    {"code": "ben_Beng", "name": "Bengali", "nativeName": "বাংলা", "azure": "bn"},
    {"code": "mar_Deva", "name": "Marathi", "nativeName": "मराठी", "azure": "mr"},
    {"code": "guj_Gujr", "name": "Gujarati", "nativeName": "ગુજરાતી", "azure": "gu"},
    {"code": "pan_Guru", "name": "Punjabi", "nativeName": "ਪੰਜਾਬੀ", "azure": "pa"},
    {"code": "ory_Orya", "name": "Odia", "nativeName": "ଓଡ଼ିଆ", "azure": "or"},
    {"code": "asm_Beng", "name": "Assamese", "nativeName": "অসমীয়া", "azure": "as"},
]
LANGUAGE_CODES = {language["code"] for language in LANGUAGES}
AZURE_CODES = {language["code"]: language["azure"] for language in LANGUAGES}

# Text people typed in an Indian script (job posts, chat…). English UI text has none of these.
INDIAN_SCRIPT = re.compile(r"[ऀ-෿]")

AZURE_MAX_ITEMS = 100
AZURE_MAX_CHARS = 45_000  # Azure allows 50,000 per request


def public_languages() -> list[dict]:
    return [{key: language[key] for key in ("code", "name", "nativeName")} for language in LANGUAGES]


def _hash(text: str) -> str:
    return hashlib.sha256(text.encode("utf-8")).hexdigest()


def _unavailable(message: str = "The translation service is not available right now") -> HTTPException:
    return HTTPException(status_code=503, detail=message)


# ── Azure AI Translator ──────────────────────────────────────────────────────


def _azure_batches(texts: list[str]):
    batch: list[str] = []
    size = 0
    for text in texts:
        if batch and (len(batch) == AZURE_MAX_ITEMS or size + len(text) > AZURE_MAX_CHARS):
            yield batch
            batch, size = [], 0
        batch.append(text)
        size += len(text)
    if batch:
        yield batch


def _azure_request(texts: list[str], language: str, source: str | None) -> list[str]:
    settings = get_settings()
    params = {"api-version": "3.0", "to": AZURE_CODES[language], "textType": "plain"}
    if source:
        params["from"] = source  # English UI text; otherwise Azure detects the language
    headers = {"Ocp-Apim-Subscription-Key": settings.azure_translator_key}
    if settings.azure_translator_region:
        headers["Ocp-Apim-Subscription-Region"] = settings.azure_translator_region

    try:
        response = httpx.post(
            f"{settings.azure_translator_endpoint.rstrip('/')}/translate",
            params=params,
            headers=headers,
            json=[{"Text": text} for text in texts],
            timeout=settings.translator_timeout,
        )
        body = response.json()
    except (httpx.HTTPError, ValueError) as exc:
        raise _unavailable() from exc

    if response.status_code == 429 or (response.status_code == 403 and "quota" in str(body).lower()):
        raise _unavailable("This month's free translation limit has been reached")
    if response.status_code != 200 or not isinstance(body, list) or len(body) != len(texts):
        raise _unavailable()
    return [item["translations"][0]["text"] for item in body]


def _azure(texts: list[str], language: str) -> list[str]:
    results: dict[int, str] = {}
    # English UI text is sent as English (detection is unreliable on short words like "Login");
    # anything in an Indian script is detected automatically.
    english = [(i, t) for i, t in enumerate(texts) if not INDIAN_SCRIPT.search(t)]
    other = [(i, t) for i, t in enumerate(texts) if INDIAN_SCRIPT.search(t)]
    for group, source in ((english, "en"), (other, None)):
        done = 0
        for batch in _azure_batches([text for _, text in group]):
            for (index, _), translated in zip(group[done : done + len(batch)], _azure_request(batch, language, source), strict=True):
                results[index] = translated
            done += len(batch)
    return [results[i] for i in range(len(texts))]


# ── Local NLLB-200 service (../translator) ───────────────────────────────────


# NLLB needs to be told the source language; guess it from the script (Devanagari is read as Hindi).
SCRIPTS = [
    (re.compile(r"[ऀ-ॿ]"), "hin_Deva"),
    (re.compile(r"[ঀ-৿]"), "ben_Beng"),
    (re.compile(r"[਀-੿]"), "pan_Guru"),
    (re.compile(r"[઀-૿]"), "guj_Gujr"),
    (re.compile(r"[଀-୿]"), "ory_Orya"),
    (re.compile(r"[஀-௿]"), "tam_Taml"),
    (re.compile(r"[ఀ-౿]"), "tel_Telu"),
    (re.compile(r"[ಀ-೿]"), "kan_Knda"),
    (re.compile(r"[ഀ-ൿ]"), "mal_Mlym"),
]


def _script_language(text: str) -> str:
    return next((code for pattern, code in SCRIPTS if pattern.search(text)), SOURCE_LANGUAGE)


def _nllb_request(texts: list[str], source: str, language: str) -> list[str]:
    settings = get_settings()
    try:
        response = httpx.post(
            f"{settings.translator_url.rstrip('/')}/translate",
            json={"texts": texts, "source": source, "target": language},
            timeout=settings.translator_timeout,
        )
        body = response.json()
    except (httpx.HTTPError, ValueError) as exc:
        raise _unavailable() from exc

    if response.status_code != 200 or not body.get("success"):
        raise _unavailable(body.get("message") or "The translation service could not translate this")
    translations = body.get("translations")
    if not isinstance(translations, list) or len(translations) != len(texts):
        raise _unavailable("The translation service returned an unexpected answer")
    return translations


def _nllb(texts: list[str], language: str) -> list[str]:
    results: dict[int, str] = {}
    groups: dict[str, list[int]] = {}
    for index, text in enumerate(texts):
        groups.setdefault(_script_language(text), []).append(index)
    for source, indexes in groups.items():
        batch = [texts[i] for i in indexes]
        translated = batch if source == language else _nllb_request(batch, source, language)
        results.update(zip(indexes, translated, strict=True))
    return [results[i] for i in range(len(texts))]


def call_translator(texts: list[str], language: str) -> list[str]:
    """Translates texts into `language` (an app code). Raises 503 when the translator can't."""
    if get_settings().azure_translator_key:
        return _azure(texts, language)
    return _nllb(texts, language)


# ── Cache ────────────────────────────────────────────────────────────────────


def needs_translation(text: str, language: str) -> bool:
    # In English only text typed in an Indian script needs translating.
    return language != SOURCE_LANGUAGE or bool(INDIAN_SCRIPT.search(text))


def translate_texts(db: Session, texts: list[str], language: str) -> dict[str, str]:
    """Returns {original: translated} for every text, from the cache or, for new texts, the translator."""
    unique = list(dict.fromkeys(texts))
    found = {text: text for text in unique if not needs_translation(text, language)}
    wanted = [text for text in unique if text not in found]
    if not wanted:
        return found

    hashes = [_hash(text) for text in wanted]
    rows = db.scalars(select(Translation).where(Translation.language == language, Translation.source_hash.in_(hashes)))
    found.update({row.source: row.text for row in rows})

    missing = [text for text in wanted if text not in found]
    if missing:
        for source, text in zip(missing, call_translator(missing, language), strict=True):
            found[source] = text
            db.add(Translation(language=language, source_hash=_hash(source), source=source, text=text))
        try:
            db.commit()
        except IntegrityError:
            db.rollback()  # a parallel request cached the same text first; the answer is still good

    return found
