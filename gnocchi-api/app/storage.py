"""Filesystem-backed image storage. Writes to IMAGE_STORAGE_DIR;
returns opaque keys that GET /images/{key} resolves."""

from __future__ import annotations

import uuid
from pathlib import Path

import aiofiles
from fastapi import HTTPException, UploadFile

from app.config import settings


ALLOWED_TYPES = {"image/jpeg": "jpg", "image/png": "png", "image/webp": "webp"}
MAX_UPLOAD_BYTES = 12 * 1024 * 1024
CHUNK_BYTES = 1024 * 1024


async def save_upload(upload: UploadFile) -> str:
    ext = ALLOWED_TYPES.get(upload.content_type or "")
    if not ext:
        raise HTTPException(status_code=400, detail=f"Unsupported image type: {upload.content_type}")
    key = f"{uuid.uuid4().hex}.{ext}"
    path = settings.image_storage_dir / key
    size = 0
    try:
        async with aiofiles.open(path, "wb") as f:
            while chunk := await upload.read(CHUNK_BYTES):
                size += len(chunk)
                if size > MAX_UPLOAD_BYTES:
                    raise HTTPException(status_code=413, detail="Image must be 12 MB or smaller.")
                await f.write(chunk)
    except Exception:
        path.unlink(missing_ok=True)
        raise
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
