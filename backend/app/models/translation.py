from sqlalchemy import String, Text, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base, TimestampMixin


class Translation(TimestampMixin, Base):
    """Cache of NLLB-200 output: each English text is sent to the translator once per language."""

    __tablename__ = "translations"
    __table_args__ = (UniqueConstraint("language", "source_hash"),)

    id: Mapped[int] = mapped_column(primary_key=True)
    language: Mapped[str] = mapped_column(String(16))
    source_hash: Mapped[str] = mapped_column(String(64))  # sha256 of `source`, so long texts can be indexed
    source: Mapped[str] = mapped_column(Text)
    text: Mapped[str] = mapped_column(Text)
