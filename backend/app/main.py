import logging
import os
import re
from contextlib import asynccontextmanager

from fastapi import Depends, FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from sqlalchemy.orm import Session
from starlette.exceptions import HTTPException

from app import models  # noqa: F401  (registers the tables)
from app.config import get_settings
from app.database import Base, engine, get_db
from app.services.storage import image_response
from app.keep_awake import keep_awake
from app.upgrades import apply_upgrades, import_disk_uploads
from app.routers import admin, applications, auth, i18n, jobs, messages, onboarding, sectors, support

logging.basicConfig(level=logging.INFO)
API_PREFIX = "/api/v1"


@asynccontextmanager
async def lifespan(_: FastAPI):
    # Creates missing tables on start. Use a migration tool (e.g. Alembic) once the schema settles.
    Base.metadata.create_all(engine)
    apply_upgrades(engine)
    import_disk_uploads(engine)
    if get_settings().seed_on_start:
        from app.seed import seed

        seed()  # sectors + admin, only what is missing
    async with keep_awake():  # on Render's free plan: stop the service from going to sleep
        yield


get_settings()  # fails fast on unsafe production settings
app = FastAPI(title="Solara API", version="1.0.0", lifespan=lifespan)
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])

for router in (auth, onboarding, sectors, jobs, applications, messages, support, admin, i18n):
    app.include_router(router.router, prefix=API_PREFIX)


# Only job photos are public. Aadhaar images go only to admins (/admin/get-document) and profile
# photos only to people who may see them (/users/get-photo). All of them are stored in the database.
@app.get("/uploads/jobs/{name}", include_in_schema=False)
def job_photo(name: str, db: Session = Depends(get_db)):
    return image_response(db, f"jobs/{name}", "public, max-age=86400")


@app.get(f"{API_PREFIX}/health")
def health():
    # `commit` shows which version Render is running; `translator` which translation service is in use.
    from app.services.translation import provider

    return {"success": True, "message": "ok", "commit": os.getenv("RENDER_GIT_COMMIT", "local")[:7], "translator": provider()}


# ── Every error has the same shape as a success: { success: false, message } ──


@app.exception_handler(HTTPException)
async def http_error(_: Request, exc: HTTPException):
    return JSONResponse({"success": False, "message": str(exc.detail)}, status_code=exc.status_code)


def _label(loc: tuple) -> str:
    field = str(loc[-1]) if loc else "Value"
    words = re.sub(r"(?<!^)(?=[A-Z])", " ", field).replace("_", " ").lower()
    return words.capitalize()


def _readable(error: dict) -> str:
    label, kind, ctx = _label(tuple(error.get("loc", ()))), error.get("type", ""), error.get("ctx") or {}
    if kind == "missing":
        return f"{label} is required"
    if kind == "string_too_short":
        return f"{label} must be at least {ctx.get('min_length')} characters"
    if kind == "string_too_long":
        return f"{label} must be at most {ctx.get('max_length')} characters"
    if kind == "string_pattern_mismatch":
        return f"Enter a valid {label.lower()}"
    if kind == "value_error" and label == "Email":
        return "Enter a valid email address"
    if kind in ("value_error", "assertion_error"):
        return str(error.get("msg", "")).removeprefix("Value error, ")
    if kind == "literal_error":
        return f"{label} must be one of: {ctx.get('expected')}"
    return f"{label}: {error.get('msg')}"


@app.exception_handler(RequestValidationError)
async def validation_error(_: Request, exc: RequestValidationError):
    errors = exc.errors()
    message = _readable(errors[0]) if errors else "Invalid request"
    return JSONResponse({"success": False, "message": message}, status_code=422)


@app.exception_handler(Exception)
async def unexpected_error(_: Request, exc: Exception):
    logging.getLogger("solara").exception("Unhandled error", exc_info=exc)
    return JSONResponse({"success": False, "message": "Something went wrong. Please try again."}, status_code=500)
