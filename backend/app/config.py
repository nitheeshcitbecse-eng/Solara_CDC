from functools import lru_cache
from pathlib import Path

from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

BASE_DIR = Path(__file__).resolve().parent.parent


class Settings(BaseSettings):
    """Every setting comes from the environment or backend/.env (see .env.example)."""

    model_config = SettingsConfigDict(env_file=BASE_DIR / ".env", env_file_encoding="utf-8", extra="ignore")

    app_env: str = "development"
    # Create the default sectors and the admin account on start-up (for hosts without a shell, e.g. Render free).
    seed_on_start: bool = False
    database_url: str = "postgresql+psycopg://postgres:postgres@localhost:5432/SOLARA"

    jwt_secret: str = "change-me-in-env"
    # How long a login lasts. Logout, a password change or a ban still ends it at once (token_version).
    jwt_expire_days: int = 180

    upload_dir: Path = BASE_DIR / "uploads"
    max_upload_mb: int = 8

    # Leave SMTP_HOST empty in development: reset codes are printed to the server log instead.
    smtp_host: str = ""
    smtp_port: int = 587
    smtp_user: str = ""
    smtp_password: str = ""
    smtp_from: str = "Solara <no-reply@solara.app>"

    # The owner account created by `python -m app.seed`.
    admin_email: str = "owner@solara.app"
    admin_password: str = "Solara@123"

    # Translation (only this backend talks to the translator). TRANSLATOR_PROVIDER: "auto" (Azure when
    # AZURE_TRANSLATOR_KEY is set, otherwise MyMemory), "mymemory", "azure" or "nllb" (local ../translator).
    translator_provider: str = "auto"
    # MyMemory is free without any account; an email raises its limit from 5,000 to 50,000 characters a day.
    mymemory_email: str = ""
    azure_translator_key: str = ""
    azure_translator_region: str = ""  # the resource's region, e.g. "centralindia" (empty for a global resource)
    azure_translator_endpoint: str = "https://api.cognitive.microsofttranslator.com"
    translator_url: str = "http://127.0.0.1:5000"
    translator_timeout: float = 120.0

    @field_validator("database_url")
    @classmethod
    def use_psycopg(cls, value: str) -> str:
        # Neon and Render give "postgresql://…" (or "postgres://…") URLs; SQLAlchemy needs the driver named.
        for prefix in ("postgresql://", "postgres://"):
            if value.startswith(prefix):
                return "postgresql+psycopg://" + value[len(prefix):]
        return value

    @field_validator("upload_dir")
    @classmethod
    def resolve_upload_dir(cls, value: Path) -> Path:
        return value if value.is_absolute() else BASE_DIR / value

    @property
    def is_production(self) -> bool:
        return self.app_env == "production"


@lru_cache
def get_settings() -> Settings:
    settings = Settings()
    if settings.is_production and settings.jwt_secret == "change-me-in-env":
        raise RuntimeError("JWT_SECRET must be set in production")
    if settings.is_production and settings.admin_password == "Solara@123":
        raise RuntimeError("ADMIN_PASSWORD must be changed in production")
    return settings
