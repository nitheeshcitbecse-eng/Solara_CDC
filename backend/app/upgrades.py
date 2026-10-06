"""Adds columns introduced after a database was first created.

`Base.metadata.create_all` only creates missing tables; it never changes existing ones. Each entry here
adds one column if it isn't there yet, so existing data is kept. Switch to Alembic once the schema
changes often.
"""

from sqlalchemy import inspect, select, text
from sqlalchemy.engine import Engine
from sqlalchemy.orm import Session

# (table, column, column definition)
COLUMNS = [
    ("applications", "contact_status", "VARCHAR(10) NOT NULL DEFAULT 'none'"),
    ("applications", "contact_note", "VARCHAR(300)"),
]


def apply_upgrades(engine: Engine) -> list[str]:
    inspector = inspect(engine)
    tables = set(inspector.get_table_names())
    added = []
    with engine.begin() as conn:
        for table, column, definition in COLUMNS:
            if table not in tables:
                continue  # create_all makes the whole table with every column
            existing = {col["name"] for col in inspector.get_columns(table)}
            if column not in existing:
                conn.execute(text(f"ALTER TABLE {table} ADD COLUMN {column} {definition}"))
                added.append(f"{table}.{column}")
    return added


def import_disk_uploads(engine: Engine) -> int:
    """Moves images that older versions saved in UPLOAD_DIR into the stored_files table (once per file)."""
    from app.config import get_settings
    from app.models import StoredFile

    root = get_settings().upload_dir
    files = [path for folder in ("profiles", "aadhaar", "jobs") for path in (root / folder).glob("*.*") if path.is_file()]
    if not files:
        return 0

    types = {".jpg": "image/jpeg", ".png": "image/png", ".webp": "image/webp"}
    with Session(engine) as db:
        known = set(db.scalars(select(StoredFile.path)))
        new = [path for path in files if f"{path.parent.name}/{path.name}" not in known and path.suffix in types]
        for path in new:
            db.add(StoredFile(path=f"{path.parent.name}/{path.name}", content_type=types[path.suffix], data=path.read_bytes()))
        db.commit()
    return len(new)
