from __future__ import annotations

from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app import schemas
from app.db import get_session
from app.models import IngredientCatalog

router = APIRouter(prefix="/ingredients", tags=["ingredients"])


@router.get("", response_model=list[schemas.IngredientOut])
async def list_ingredients(session: AsyncSession = Depends(get_session)):
    result = await session.execute(
        select(IngredientCatalog).order_by(IngredientCatalog.category, IngredientCatalog.ord, IngredientCatalog.name)
    )
    return list(result.scalars().all())
