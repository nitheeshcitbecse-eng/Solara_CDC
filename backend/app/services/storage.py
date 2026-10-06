"""Uploaded images, stored in the database (table stored_files).

Every image is checked, turned upright, shrunk to at most 1600 px and saved as JPEG. That keeps the database
small (a phone photo becomes ~200 KB) and strips EXIF data such as the GPS location.
"""

import secrets
from io import BytesIO

from fastapi import HTTPException, UploadFile, status
from fastapi.responses import Response
from PIL import Image, ImageOps, UnidentifiedImageError
from sqlalchemy import delete
from sqlalchemy.orm import Session

from app.config import get_settings
from app.models import StoredFile

MAX_SIDE = 1600
JPEG_QUALITY = 82
Image.MAX_IMAGE_PIXELS = 40_000_000  # refuse "decompression bombs"

# Identify images by their first bytes, never by the file name or the client's content type.
SIGNATURES = (b"\xff\xd8\xff", b"\x89PNG\r\n\x1a\n")


def _is_image(head: bytes) -> bool:
    return head.startswith(SIGNATURES) or (head[:4] == b"RIFF" and head[8:12] == b"WEBP")


def _to_jpeg(data: bytes) -> bytes:
    try:
        with Image.open(BytesIO(data)) as image:
            image = ImageOps.exif_transpose(image)
            if image.mode in ("RGBA", "LA", "P"):
                image = image.convert("RGBA")
                background = Image.new("RGB", image.size, "white")
                background.paste(image, mask=image.getchannel("A"))
                image = background
            image = image.convert("RGB")
            image.thumbnail((MAX_SIDE, MAX_SIDE))
            out = BytesIO()
            image.save(out, "JPEG", quality=JPEG_QUALITY, optimize=True)
            return out.getvalue()
    except (UnidentifiedImageError, OSError, ValueError, Image.DecompressionBombError) as exc:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "This image could not be read. Try another photo.") from exc


async def save_image(db: Session, upload: UploadFile, folder: str) -> str:
    """Stores an uploaded image and returns its key ("<folder>/<random>.jpg"). The caller commits."""
    settings = get_settings()
    limit = settings.max_upload_mb * 1024 * 1024
    data = await upload.read(limit + 1)
    if len(data) > limit:
        raise HTTPException(status.HTTP_413_CONTENT_TOO_LARGE, f"Each image must be under {settings.max_upload_mb} MB")
    if not _is_image(data[:12]):
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Only JPG, PNG or WEBP images are allowed")

    path = f"{folder}/{secrets.token_hex(16)}.jpg"
    db.add(StoredFile(path=path, content_type="image/jpeg", data=_to_jpeg(data)))
    return path


def delete_file(db: Session, path: str | None) -> None:
    if path:
        db.execute(delete(StoredFile).where(StoredFile.path == path))


def image_response(db: Session, path: str | None, cache: str, missing: str = "Photo not found") -> Response:
    stored = db.get(StoredFile, path) if path else None
    if stored is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, missing)
    return Response(content=stored.data, media_type=stored.content_type, headers={"Cache-Control": cache})
