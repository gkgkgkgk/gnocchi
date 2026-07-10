from __future__ import annotations

from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app import schemas
from app.db import get_session
from app.models import Unit

router = APIRouter(prefix="/units", tags=["units"])


@router.get("", response_model=list[schemas.UnitOut])
async def list_units(session: AsyncSession = Depends(get_session)):
    result = await session.execute(select(Unit).order_by(Unit.type, Unit.ord, Unit.name))
    return list(result.scalars().all())
