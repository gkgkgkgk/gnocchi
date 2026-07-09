"""SQLAlchemy models. One row per real-world thing; JSONB for nested lists
so the frontend can round-trip recipes without join gymnastics."""

from __future__ import annotations

import uuid
from datetime import datetime
from typing import Any

from sqlalchemy import CheckConstraint, DateTime, ForeignKey, Integer, String, Text, func
from sqlalchemy.dialects.postgresql import ARRAY, JSONB, UUID
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column, relationship


class Base(DeclarativeBase):
    pass


class Recipe(Base):
    __tablename__ = "recipes"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    title: Mapped[str] = mapped_column(String, nullable=False)
    ingredients: Mapped[list[dict[str, Any]]] = mapped_column(
        JSONB, nullable=False, default=list
    )  # [{text, quantity, unit}]
    steps: Mapped[list[str]] = mapped_column(ARRAY(Text), nullable=False, default=list)
    annotated_steps: Mapped[list[dict[str, Any]] | None] = mapped_column(JSONB)
    notes: Mapped[str | None] = mapped_column(Text)
    source_url: Mapped[str | None] = mapped_column(Text)
    source_type: Mapped[str | None] = mapped_column(String(32))
    prep_time: Mapped[int | None] = mapped_column(Integer)
    cook_time: Mapped[int | None] = mapped_column(Integer)
    servings: Mapped[int | None] = mapped_column(Integer)
    rating: Mapped[int | None] = mapped_column(Integer)
    cook_history: Mapped[list[dict[str, Any]]] = mapped_column(
        JSONB, nullable=False, default=list
    )  # [{date, note, rating?, photos?}]
    ai_insight: Mapped[dict[str, Any] | None] = mapped_column(JSONB)
    tags: Mapped[list[str]] = mapped_column(ARRAY(Text), nullable=False, default=list)
    cover_image: Mapped[str | None] = mapped_column(Text)  # storage key
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False
    )

    photos: Mapped[list["RecipePhoto"]] = relationship(
        back_populates="recipe", cascade="all, delete-orphan", order_by="RecipePhoto.ord"
    )

    __table_args__ = (
        CheckConstraint("rating IS NULL OR (rating BETWEEN 1 AND 5)", name="rating_range"),
    )


class RecipePhoto(Base):
    __tablename__ = "recipe_photos"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    recipe_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("recipes.id", ondelete="CASCADE"), nullable=False
    )
    key: Mapped[str] = mapped_column(String, nullable=False)  # filename in IMAGE_STORAGE_DIR
    ord: Mapped[int] = mapped_column(Integer, nullable=False, default=0)

    recipe: Mapped[Recipe] = relationship(back_populates="photos")


class Cookbook(Base):
    __tablename__ = "cookbooks"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    name: Mapped[str] = mapped_column(String, nullable=False)
    description: Mapped[str | None] = mapped_column(Text)
    cover_color: Mapped[str | None] = mapped_column(String(16))
    recipe_ids: Mapped[list[str]] = mapped_column(
        ARRAY(Text), nullable=False, default=list
    )  # stored as UUID strings, ordered
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )


class Tag(Base):
    __tablename__ = "tags"

    id: Mapped[str] = mapped_column(String, primary_key=True)
    name: Mapped[str] = mapped_column(String, nullable=False)
    color: Mapped[str] = mapped_column(String(16), nullable=False)
    icon: Mapped[str] = mapped_column(String, nullable=False)


class AITool(Base):
    __tablename__ = "ai_tools"

    id: Mapped[str] = mapped_column(String, primary_key=True)
    name: Mapped[str] = mapped_column(String, nullable=False)
    description: Mapped[str] = mapped_column(Text, nullable=False)
    icon: Mapped[str] = mapped_column(String, nullable=False)
    prompt: Mapped[str] = mapped_column(Text, nullable=False)


class Singleton(Base):
    """One-row table holding household-wide state: meal plan, house
    preferences. Keyed by a fixed string so upserts are trivial."""

    __tablename__ = "singletons"

    key: Mapped[str] = mapped_column(String, primary_key=True)
    value: Mapped[dict[str, Any]] = mapped_column(JSONB, nullable=False, default=dict)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False
    )
