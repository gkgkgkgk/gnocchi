"""Filesystem-backed image storage. Writes to IMAGE_STORAGE_DIR;
returns opaque keys that GET /images/{key} resolves."""

from __future__ import annotations

import uuid
from pathlib import Path

import aiofiles
from fastapi import HTTPException, UploadFile

from app.config import settings


ALLOWED_TYPES = {"image/jpeg": "jpg", "image/png": "png", "image/webp": "webp"}


async def save_upload(upload: UploadFile) -> str:
    ext = ALLOWED_TYPES.get(upload.content_type or "")
    if not ext:
        raise HTTPException(status_code=400, detail=f"Unsupported image type: {upload.content_type}")
    key = f"{uuid.uuid4().hex}.{ext}"
    path = settings.image_storage_dir / key
    async with aiofiles.open(path, "wb") as f:
        await f.write(await upload.read())
    return key


def path_for(key: str) -> Path:
    # Prevent path traversal.
    if "/" in key or ".." in key:
        raise HTTPException(status_code=400, detail="Invalid image key.")
    p = settings.image_storage_dir / key
    if not p.exists():
        raise HTTPException(status_code=404, detail="Image not found.")
    return p


def delete(key: str) -> None:
    try:
        (settings.image_storage_dir / key).unlink(missing_ok=True)
    except OSError:
        pass
