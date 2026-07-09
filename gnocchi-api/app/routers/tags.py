from __future__ import annotations

from fastapi import APIRouter, Depends
from sqlalchemy import delete, select
from sqlalchemy.ext.asyncio import AsyncSession

from app import schemas
from app.db import get_session
from app.models import Tag

router = APIRouter(prefix="/tags", tags=["tags"])


@router.get("", response_model=list[schemas.TagIO])
async def list_tags(session: AsyncSession = Depends(get_session)):
    result = await session.execute(select(Tag).order_by(Tag.name))
    return list(result.scalars().all())


@router.put("", response_model=list[schemas.TagIO])
async def replace_tags(
    body: list[schemas.TagIO], session: AsyncSession = Depends(get_session)
):
    # Simple replace: wipe + reinsert. Household-scale, no concurrent edits.
    await session.execute(delete(Tag))
    for t in body:
        session.add(Tag(**t.model_dump()))
    await session.commit()
    result = await session.execute(select(Tag).order_by(Tag.name))
    return list(result.scalars().all())
