from sqlalchemy import LargeBinary, String
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base, TimestampMixin


class StoredFile(TimestampMixin, Base):
    """Uploaded images, kept in the database so they survive restarts on hosts with a temporary disk
    (Render free). `path` is the key the other tables store, e.g. "profiles/<random>.jpg"."""

    __tablename__ = "stored_files"

    path: Mapped[str] = mapped_column(String(255), primary_key=True)
    content_type: Mapped[str] = mapped_column(String(40))
    data: Mapped[bytes] = mapped_column(LargeBinary)
