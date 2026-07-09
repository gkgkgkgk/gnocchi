"""House preferences + meal plan — one row each in the singletons table."""

from __future__ import annotations

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app import schemas
from app.db import get_session
from app.models import Singleton

router = APIRouter(tags=["singletons"])


async def _get_or_create(session: AsyncSession, key: str, default: dict) -> Singleton:
    row = await session.get(Singleton, key)
    if row is None:
        row = Singleton(key=key, value=default)
        session.add(row)
        await session.flush()
    return row


@router.get("/preferences", response_model=schemas.Preferences)
async def get_preferences(session: AsyncSession = Depends(get_session)):
    row = await _get_or_create(session, "preferences", {})
    await session.commit()
    return schemas.Preferences(**row.value)


@router.put("/preferences", response_model=schemas.Preferences)
async def put_preferences(
    body: schemas.Preferences, session: AsyncSession = Depends(get_session)
):
    row = await _get_or_create(session, "preferences", {})
    row.value = body.model_dump()
    await session.commit()
    return body


@router.get("/meal-plan", response_model=schemas.MealPlan)
async def get_meal_plan(session: AsyncSession = Depends(get_session)):
    row = await _get_or_create(session, "meal_plan", {})
    await session.commit()
    return schemas.MealPlan(**row.value) if row.value else schemas.MealPlan()


@router.put("/meal-plan", response_model=schemas.MealPlan)
async def put_meal_plan(
    body: schemas.MealPlan, session: AsyncSession = Depends(get_session)
):
    row = await _get_or_create(session, "meal_plan", {})
    row.value = body.model_dump()
    await session.commit()
    return body
