from __future__ import annotations

import uuid

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app import schemas
from app.db import get_session
from app.models import Cookbook

router = APIRouter(prefix="/cookbooks", tags=["cookbooks"])


def _to_out(c: Cookbook) -> schemas.CookbookOut:
    return schemas.CookbookOut(
        id=c.id,
        name=c.name,
        description=c.description,
        cover_color=c.cover_color,
        recipe_ids=list(c.recipe_ids),
        recipe_count=len(c.recipe_ids),
        created_at=c.created_at,
    )


@router.get("", response_model=list[schemas.CookbookOut])
async def list_cookbooks(session: AsyncSession = Depends(get_session)):
    result = await session.execute(select(Cookbook).order_by(Cookbook.created_at.desc()))
    return [_to_out(c) for c in result.scalars().all()]


@router.post("", response_model=schemas.CookbookOut, status_code=201)
async def create_cookbook(body: schemas.CookbookIn, session: AsyncSession = Depends(get_session)):
    c = Cookbook(**body.model_dump())
    session.add(c)
    await session.commit()
    await session.refresh(c)
    return _to_out(c)


@router.get("/{id}", response_model=schemas.CookbookOut)
async def get_cookbook(id: uuid.UUID, session: AsyncSession = Depends(get_session)):
    c = await session.get(Cookbook, id)
    if c is None:
        raise HTTPException(status_code=404, detail="Cookbook not found")
    return _to_out(c)


@router.patch("/{id}", response_model=schemas.CookbookOut)
async def update_cookbook(
    id: uuid.UUID,
    body: schemas.CookbookIn,
    session: AsyncSession = Depends(get_session),
):
    c = await session.get(Cookbook, id)
    if c is None:
        raise HTTPException(status_code=404, detail="Cookbook not found")
    for k, v in body.model_dump(exclude_unset=True).items():
        setattr(c, k, v)
    await session.commit()
    await session.refresh(c)
    return _to_out(c)


@router.delete("/{id}", status_code=204)
async def delete_cookbook(id: uuid.UUID, session: AsyncSession = Depends(get_session)):
    c = await session.get(Cookbook, id)
    if c is None:
        raise HTTPException(status_code=404, detail="Cookbook not found")
    await session.delete(c)
    await session.commit()
