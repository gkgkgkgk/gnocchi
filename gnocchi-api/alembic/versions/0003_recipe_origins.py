"""Keep a link from a saved variation to its source recipe.

Revision ID: 0003
Revises: 0002
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "0003"
down_revision: str | None = "0002"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column("recipes", sa.Column("source_recipe_id", postgresql.UUID(as_uuid=True)))
    op.create_foreign_key(
        "recipes_source_recipe_id_fkey", "recipes", "recipes", ["source_recipe_id"], ["id"],
        ondelete="SET NULL",
    )
    op.create_index("recipes_source_recipe_id_idx", "recipes", ["source_recipe_id"])


def downgrade() -> None:
    op.drop_index("recipes_source_recipe_id_idx", table_name="recipes")
    op.drop_constraint("recipes_source_recipe_id_fkey", "recipes", type_="foreignkey")
    op.drop_column("recipes", "source_recipe_id")
