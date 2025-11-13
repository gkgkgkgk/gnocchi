from pydantic import BaseModel

# Here is where the model for my model outputs are defined

class RecipeMetadata(BaseModel):
    prep_time: int
    cook_time: int
    servings: int

class Ingredient(BaseModel):
    text: str  # Raw ingredient text as written (e.g., "2 cups flour, sifted")
    id: str | None = None  # Optional ingredient ID for linking to ingredients table
    quantity: float
    unit: str

class Recipe(BaseModel):
    title: str
    ingredients: list[Ingredient]
    instructions: list[str]
    notes: str
    metadata: RecipeMetadata