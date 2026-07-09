"""initial schema + default seed data

Revision ID: 0001
Revises:
Create Date: 2026-07-08
"""

from __future__ import annotations

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql


revision: str = "0001"
down_revision: str | None = None
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


DEFAULT_TAGS = [
    ("quick", "Quick", "#FF9800", "flash"),
    ("healthy", "Healthy", "#4CAF50", "leaf"),
    ("comfort", "Comfort Food", "#F44336", "heart"),
    ("vegetarian", "Vegetarian", "#8BC34A", "nutrition"),
    ("dessert", "Dessert", "#E91E63", "ice-cream"),
    ("spicy", "Spicy", "#FF5722", "flame"),
]


DEFAULT_TOOLS = [
    (
        "suggest_substitutions",
        "Suggest substitutions",
        "Find ingredient substitutions based on dietary restrictions",
        "swap-horizontal",
        "When ingredients conflict with dietary restrictions, suggest reasonable swaps that preserve the dish's character.",
    ),
    (
        "scale_recipe",
        "Scale recipe",
        "Adjust recipe quantities for a different serving size",
        "resize",
        "Recompute all ingredient quantities proportionally. Round to sensible cooking measures.",
    ),
    (
        "make_kosher",
        "Make it kosher",
        "Convert this recipe to comply with kosher laws",
        "shield-checkmark",
        "Replace non-kosher ingredients with kosher equivalents. Separate meat and dairy — if both are present, choose one and swap the other.",
    ),
    (
        "cooking_tips",
        "Cooking tips",
        "Get helpful tips and techniques for this recipe",
        "bulb",
        "Add short, practical tips inline in the instructions (temperature cues, doneness signals, common pitfalls).",
    ),
]


def upgrade() -> None:
    op.execute("CREATE EXTENSION IF NOT EXISTS pgcrypto")
    op.execute("CREATE EXTENSION IF NOT EXISTS pg_trgm")

    op.create_table(
        "recipes",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("title", sa.String(), nullable=False),
        sa.Column("ingredients", postgresql.JSONB(), nullable=False, server_default=sa.text("'[]'::jsonb")),
        sa.Column("steps", postgresql.ARRAY(sa.Text()), nullable=False, server_default=sa.text("'{}'::text[]")),
        sa.Column("annotated_steps", postgresql.JSONB(), nullable=True),
        sa.Column("notes", sa.Text(), nullable=True),
        sa.Column("source_url", sa.Text(), nullable=True),
        sa.Column("source_type", sa.String(32), nullable=True),
        sa.Column("prep_time", sa.Integer(), nullable=True),
        sa.Column("cook_time", sa.Integer(), nullable=True),
        sa.Column("servings", sa.Integer(), nullable=True),
        sa.Column("rating", sa.Integer(), nullable=True),
        sa.Column("cook_history", postgresql.JSONB(), nullable=False, server_default=sa.text("'[]'::jsonb")),
        sa.Column("ai_insight", postgresql.JSONB(), nullable=True),
        sa.Column("tags", postgresql.ARRAY(sa.Text()), nullable=False, server_default=sa.text("'{}'::text[]")),
        sa.Column("cover_image", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.CheckConstraint("rating IS NULL OR (rating BETWEEN 1 AND 5)", name="rating_range"),
    )
    op.create_index("recipes_title_trgm", "recipes", ["title"], postgresql_using="gin", postgresql_ops={"title": "gin_trgm_ops"})

    op.create_table(
        "recipe_photos",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("recipe_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("recipes.id", ondelete="CASCADE"), nullable=False),
        sa.Column("key", sa.String(), nullable=False),
        sa.Column("ord", sa.Integer(), nullable=False, server_default="0"),
    )
    op.create_index("recipe_photos_recipe_id", "recipe_photos", ["recipe_id"])

    op.create_table(
        "cookbooks",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("name", sa.String(), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("cover_color", sa.String(16), nullable=True),
        sa.Column("recipe_ids", postgresql.ARRAY(sa.Text()), nullable=False, server_default=sa.text("'{}'::text[]")),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )

    op.create_table(
        "tags",
        sa.Column("id", sa.String(), primary_key=True),
        sa.Column("name", sa.String(), nullable=False),
        sa.Column("color", sa.String(16), nullable=False),
        sa.Column("icon", sa.String(), nullable=False),
    )

    op.create_table(
        "ai_tools",
        sa.Column("id", sa.String(), primary_key=True),
        sa.Column("name", sa.String(), nullable=False),
        sa.Column("description", sa.Text(), nullable=False),
        sa.Column("icon", sa.String(), nullable=False),
        sa.Column("prompt", sa.Text(), nullable=False),
    )

    op.create_table(
        "singletons",
        sa.Column("key", sa.String(), primary_key=True),
        sa.Column("value", postgresql.JSONB(), nullable=False, server_default=sa.text("'{}'::jsonb")),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )

    # Seed default tags and AI tools.
    tags_table = sa.table(
        "tags",
        sa.column("id", sa.String()),
        sa.column("name", sa.String()),
        sa.column("color", sa.String()),
        sa.column("icon", sa.String()),
    )
    op.bulk_insert(tags_table, [{"id": t[0], "name": t[1], "color": t[2], "icon": t[3]} for t in DEFAULT_TAGS])

    tools_table = sa.table(
        "ai_tools",
        sa.column("id", sa.String()),
        sa.column("name", sa.String()),
        sa.column("description", sa.Text()),
        sa.column("icon", sa.String()),
        sa.column("prompt", sa.Text()),
    )
    op.bulk_insert(
        tools_table,
        [
            {"id": t[0], "name": t[1], "description": t[2], "icon": t[3], "prompt": t[4]}
            for t in DEFAULT_TOOLS
        ],
    )


def downgrade() -> None:
    op.drop_table("singletons")
    op.drop_table("ai_tools")
    op.drop_table("tags")
    op.drop_table("cookbooks")
    op.drop_index("recipe_photos_recipe_id", table_name="recipe_photos")
    op.drop_table("recipe_photos")
    op.drop_index("recipes_title_trgm", table_name="recipes")
    op.drop_table("recipes")
