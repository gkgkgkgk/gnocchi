from __future__ import annotations

import uuid
from typing import Any

from fastapi import APIRouter, Depends, HTTPException, UploadFile
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app import schemas, storage
from app.db import get_session
from app.models import Recipe, RecipePhoto

router = APIRouter(prefix="/recipes", tags=["recipes"])


async def _load(session: AsyncSession, id: uuid.UUID) -> Recipe:
    result = await session.execute(
        select(Recipe).options(selectinload(Recipe.photos)).where(Recipe.id == id)
    )
    recipe = result.scalar_one_or_none()
    if recipe is None:
        raise HTTPException(status_code=404, detail="Recipe not found")
    return recipe


@router.get("", response_model=list[schemas.RecipeOut])
async def list_recipes(session: AsyncSession = Depends(get_session)):
    result = await session.execute(
        select(Recipe).options(selectinload(Recipe.photos)).order_by(Recipe.created_at.desc())
    )
    return list(result.scalars().all())


@router.post("", response_model=schemas.RecipeOut, status_code=201)
async def create_recipe(
    body: schemas.RecipeCreate, session: AsyncSession = Depends(get_session)
):
    recipe = Recipe(**body.model_dump(mode="json"))
    session.add(recipe)
    await session.commit()
    return await _load(session, recipe.id)


@router.get("/{id}", response_model=schemas.RecipeOut)
async def get_recipe(id: uuid.UUID, session: AsyncSession = Depends(get_session)):
    return await _load(session, id)


@router.patch("/{id}", response_model=schemas.RecipeOut)
async def update_recipe(
    id: uuid.UUID,
    body: schemas.RecipeUpdate,
    session: AsyncSession = Depends(get_session),
):
    recipe = await _load(session, id)
    updates: dict[str, Any] = body.model_dump(exclude_unset=True, mode="json")
    for k, v in updates.items():
        setattr(recipe, k, v)
    await session.commit()
    return await _load(session, id)


@router.delete("/{id}", status_code=204)
async def delete_recipe(id: uuid.UUID, session: AsyncSession = Depends(get_session)):
    recipe = await _load(session, id)
    for photo in recipe.photos:
        storage.delete(photo.key)
    await session.delete(recipe)
    await session.commit()


@router.patch("/{id}/rating", response_model=schemas.RecipeOut)
async def set_rating(
    id: uuid.UUID,
    body: schemas.RatingUpdate,
    session: AsyncSession = Depends(get_session),
):
    recipe = await _load(session, id)
    recipe.rating = body.rating
    await session.commit()
    return await _load(session, id)


@router.post("/{id}/cook-notes", response_model=schemas.RecipeOut)
async def add_cook_note(
    id: uuid.UUID,
    body: schemas.CookNote,
    session: AsyncSession = Depends(get_session),
):
    recipe = await _load(session, id)
    recipe.cook_history = [*recipe.cook_history, body.model_dump(mode="json")]
    await session.commit()
    return await _load(session, id)


@router.post("/{id}/photos", response_model=schemas.RecipePhotoOut, status_code=201)
async def upload_photo(
    id: uuid.UUID,
    image: UploadFile,
    session: AsyncSession = Depends(get_session),
):
    recipe = await _load(session, id)
    key = await storage.save_upload(image)
    next_ord = max((p.ord for p in recipe.photos), default=-1) + 1
    photo = RecipePhoto(recipe_id=id, key=key, ord=next_ord)
    session.add(photo)
    # Auto-set cover if none.
    if not recipe.cover_image:
        recipe.cover_image = key
    await session.commit()
    await session.refresh(photo)
    return photo


@router.patch("/{id}/photos/order", response_model=schemas.RecipeOut)
async def reorder_photos(
    id: uuid.UUID,
    body: schemas.PhotoReorder,
    session: AsyncSession = Depends(get_session),
):
    recipe = await _load(session, id)
    pos = {pid: i for i, pid in enumerate(body.order)}
    for photo in recipe.photos:
        if photo.id in pos:
            photo.ord = pos[photo.id]
    await session.commit()
    return await _load(session, id)


@router.patch("/{id}/cover/{photo_id}", response_model=schemas.RecipeOut)
async def set_cover(
    id: uuid.UUID,
    photo_id: uuid.UUID,
    session: AsyncSession = Depends(get_session),
):
    recipe = await _load(session, id)
    photo = next((p for p in recipe.photos if p.id == photo_id), None)
    if photo is None:
        raise HTTPException(status_code=404, detail="Photo not found")
    recipe.cover_image = photo.key
    await session.commit()
    return await _load(session, id)


@router.delete("/{id}/photos/{photo_id}", status_code=204)
async def delete_photo(
    id: uuid.UUID,
    photo_id: uuid.UUID,
    session: AsyncSession = Depends(get_session),
):
    recipe = await _load(session, id)
    photo = next((p for p in recipe.photos if p.id == photo_id), None)
    if photo is None:
        raise HTTPException(status_code=404, detail="Photo not found")
    storage.delete(photo.key)
    if recipe.cover_image == photo.key:
        remaining = [p for p in recipe.photos if p.id != photo_id]
        recipe.cover_image = remaining[0].key if remaining else None
    await session.delete(photo)
    await session.commit()
