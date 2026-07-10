"""canonical units + curated ingredient catalog

Revision ID: 0002
Revises: 0001
Create Date: 2026-07-10
"""

from __future__ import annotations

import re
from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op


revision: str = "0002"
down_revision: str | None = "0001"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


# (id, name, abbreviation, plural, system, type, to_base)
# to_base = multiplier into the base unit of its type (volume→ml, weight→g,
# count→1). None means the unit doesn't convert (ingredient-specific).
DEFAULT_UNITS = [
    # Volume — base ml
    ("tsp", "teaspoon", "tsp", "teaspoons", "imperial", "volume", 4.92892),
    ("tbsp", "tablespoon", "tbsp", "tablespoons", "imperial", "volume", 14.7868),
    ("fl-oz", "fluid ounce", "fl oz", "fluid ounces", "imperial", "volume", 29.5735),
    ("cup", "cup", "cup", "cups", "imperial", "volume", 236.588),
    ("pint", "pint", "pt", "pints", "imperial", "volume", 473.176),
    ("quart", "quart", "qt", "quarts", "imperial", "volume", 946.353),
    ("gallon", "gallon", "gal", "gallons", "imperial", "volume", 3785.41),
    ("ml", "milliliter", "ml", "milliliters", "metric", "volume", 1.0),
    ("l", "liter", "L", "liters", "metric", "volume", 1000.0),
    ("pinch", "pinch", "pinch", "pinches", "universal", "volume", 0.3080),
    ("dash", "dash", "dash", "dashes", "universal", "volume", 0.6160),
    # Weight — base g
    ("g", "gram", "g", "grams", "metric", "weight", 1.0),
    ("kg", "kilogram", "kg", "kilograms", "metric", "weight", 1000.0),
    ("mg", "milligram", "mg", "milligrams", "metric", "weight", 0.001),
    ("oz", "ounce", "oz", "ounces", "imperial", "weight", 28.3495),
    ("lb", "pound", "lb", "pounds", "imperial", "weight", 453.592),
    # Count — base 1
    ("each", "each", "ea", "each", "universal", "count", 1.0),
    ("dozen", "dozen", "dz", "dozen", "universal", "count", 12.0),
    # Ingredient-specific (no conversion)
    ("clove", "clove", "clove", "cloves", "universal", "count", None),
    ("can", "can", "can", "cans", "universal", "count", None),
    ("slice", "slice", "slice", "slices", "universal", "count", None),
    ("stick", "stick", "stick", "sticks", "universal", "count", None),
    ("bunch", "bunch", "bunch", "bunches", "universal", "count", None),
    ("sprig", "sprig", "sprig", "sprigs", "universal", "count", None),
    ("head", "head", "head", "heads", "universal", "count", None),
    ("package", "package", "pkg", "packages", "universal", "count", None),
    ("to-taste", "to taste", "to taste", "to taste", "universal", "count", None),
]


# (name, category)
DEFAULT_INGREDIENTS = [
    # Produce
    ("onion", "produce"), ("garlic", "produce"), ("tomato", "produce"),
    ("potato", "produce"), ("carrot", "produce"), ("celery", "produce"),
    ("bell pepper", "produce"), ("spinach", "produce"), ("broccoli", "produce"),
    ("mushroom", "produce"), ("lemon", "produce"), ("lime", "produce"),
    ("ginger", "produce"), ("scallion", "produce"), ("cucumber", "produce"),
    ("avocado", "produce"), ("zucchini", "produce"), ("lettuce", "produce"),
    # Herbs
    ("cilantro", "herb"), ("parsley", "herb"), ("basil", "herb"),
    ("thyme", "herb"), ("rosemary", "herb"), ("oregano", "herb"),
    # Dairy
    ("butter", "dairy"), ("milk", "dairy"), ("heavy cream", "dairy"),
    ("egg", "dairy"), ("parmesan", "dairy"), ("cheddar cheese", "dairy"),
    ("mozzarella", "dairy"), ("cream cheese", "dairy"), ("sour cream", "dairy"),
    ("yogurt", "dairy"), ("feta", "dairy"),
    # Meat & seafood
    ("chicken breast", "meat"), ("chicken thigh", "meat"), ("ground beef", "meat"),
    ("bacon", "meat"), ("pork", "meat"), ("sausage", "meat"), ("steak", "meat"),
    ("salmon", "seafood"), ("shrimp", "seafood"), ("tuna", "seafood"),
    # Pantry
    ("olive oil", "pantry"), ("vegetable oil", "pantry"), ("all-purpose flour", "pantry"),
    ("sugar", "pantry"), ("brown sugar", "pantry"), ("salt", "pantry"),
    ("black pepper", "pantry"), ("baking powder", "pantry"), ("baking soda", "pantry"),
    ("honey", "pantry"), ("soy sauce", "pantry"), ("vinegar", "pantry"),
    ("tomato paste", "pantry"), ("chicken broth", "pantry"), ("rice", "pantry"),
    ("pasta", "pantry"), ("breadcrumbs", "pantry"), ("cornstarch", "pantry"),
    ("vanilla extract", "pantry"), ("canned tomatoes", "pantry"), ("coconut milk", "pantry"),
    ("maple syrup", "pantry"), ("mustard", "pantry"), ("mayonnaise", "pantry"),
    ("ketchup", "pantry"),
    # Spices
    ("cumin", "spice"), ("paprika", "spice"), ("cinnamon", "spice"),
    ("chili powder", "spice"), ("red pepper flakes", "spice"), ("bay leaf", "spice"),
    ("nutmeg", "spice"), ("garlic powder", "spice"), ("onion powder", "spice"),
    # Baking
    ("chocolate chips", "baking"), ("cocoa powder", "baking"),
    ("powdered sugar", "baking"), ("yeast", "baking"),
    # Nuts
    ("almonds", "nut"), ("walnuts", "nut"), ("peanut butter", "nut"),
]


def _slug(name: str) -> str:
    return re.sub(r"[^a-z0-9]+", "-", name.lower()).strip("-")


def upgrade() -> None:
    op.create_table(
        "units",
        sa.Column("id", sa.String(), primary_key=True),
        sa.Column("name", sa.String(), nullable=False),
        sa.Column("abbreviation", sa.String(), nullable=False),
        sa.Column("plural", sa.String(), nullable=True),
        sa.Column("system", sa.String(16), nullable=False),
        sa.Column("type", sa.String(16), nullable=False),
        sa.Column("to_base", sa.Float(), nullable=True),
        sa.Column("ord", sa.Integer(), nullable=False, server_default="0"),
    )

    op.create_table(
        "ingredient_catalog",
        sa.Column("id", sa.String(), primary_key=True),
        sa.Column("name", sa.String(), nullable=False),
        sa.Column("category", sa.String(32), nullable=True),
        sa.Column("ord", sa.Integer(), nullable=False, server_default="0"),
    )

    units_table = sa.table(
        "units",
        sa.column("id", sa.String()),
        sa.column("name", sa.String()),
        sa.column("abbreviation", sa.String()),
        sa.column("plural", sa.String()),
        sa.column("system", sa.String()),
        sa.column("type", sa.String()),
        sa.column("to_base", sa.Float()),
        sa.column("ord", sa.Integer()),
    )
    op.bulk_insert(
        units_table,
        [
            {
                "id": u[0], "name": u[1], "abbreviation": u[2], "plural": u[3],
                "system": u[4], "type": u[5], "to_base": u[6], "ord": i,
            }
            for i, u in enumerate(DEFAULT_UNITS)
        ],
    )

    ingredients_table = sa.table(
        "ingredient_catalog",
        sa.column("id", sa.String()),
        sa.column("name", sa.String()),
        sa.column("category", sa.String()),
        sa.column("ord", sa.Integer()),
    )
    op.bulk_insert(
        ingredients_table,
        [
            {"id": _slug(name), "name": name, "category": cat, "ord": i}
            for i, (name, cat) in enumerate(DEFAULT_INGREDIENTS)
        ],
    )


def downgrade() -> None:
    op.drop_table("ingredient_catalog")
    op.drop_table("units")
