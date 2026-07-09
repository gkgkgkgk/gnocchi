from fastapi import APIRouter
from fastapi.responses import FileResponse

from app import storage

router = APIRouter(prefix="/images", tags=["images"])


@router.get("/{key}")
async def get_image(key: str):
    path = storage.path_for(key)
    return FileResponse(path)
