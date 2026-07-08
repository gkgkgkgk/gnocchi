from typing import ItemsView
import asyncio
from fastapi import FastAPI, HTTPException, BackgroundTasks, File, UploadFile, Form
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from dotenv import load_dotenv
import os
import base64
from openai import AsyncOpenAI
from models import Ingredient, Recipe
from scrape import scrape_pinterest_link, scrape_website
from rich import print as rprint

# Load env vars
load_dotenv()
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")

# Init OpenAI client
client = AsyncOpenAI(api_key=OPENAI_API_KEY)

# FastAPI app
app = FastAPI()

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, replace with specific origins
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Request schema
class ChatRequest(BaseModel):
    message: str

# Response schema
class ChatResponse(BaseModel):
    reply: str

class PinterestRequest(BaseModel):
    url: str

class WebsiteRequest(BaseModel):
    url: str

class ScrapedRecipeResponse(BaseModel):
    recipe: Recipe
    source_url: str
    source_image: str | None

class AnnotateRecipeRequest(BaseModel):
    instructions: list[str]
    ingredients: list[str]

class AnnotatedInstruction(BaseModel):
    original: str
    annotated: str

class AnnotateRecipeResponse(BaseModel):
    annotated_instructions: list[AnnotatedInstruction]

class UserProfile(BaseModel):
    display_name: str | None = None
    dietary_restrictions: list[str] | None = None
    favorite_food: str | None = None

class AITool(BaseModel):
    name: str
    description: str
    prompt: str

class RecipeInsightRequest(BaseModel):
    recipe: Recipe
    user_profile: UserProfile
    available_tools: list[AITool] | None = None

class RecipeInsight(BaseModel):
    insight: str
    recommended_tool: str | None

class RecipeInsightResponse(BaseModel):
    insight: str
    recommended_tool: str | None

class ExecuteToolRequest(BaseModel):
    recipe: Recipe
    tool: AITool
    user_guidance: str | None = None
    ai_reasoning: str | None = None

class ExecuteToolResponse(BaseModel):
    recipe: Recipe

class ShoppingListItem(BaseModel):
    text: str
    source: list[str]

class ShoppingListRequest(BaseModel):
    items: list[ShoppingListItem]

class ShoppingListResponse(BaseModel):
    items: list[ShoppingListItem]

@app.get("/health")
async def health():
    return {"ok": True}

@app.post("/structure-recipe", response_model=ChatResponse)
async def structure_recipe(req: ChatRequest):
    # Call OpenAI
    completion = await client.chat.completions.parse(
        model="gpt-4o-mini",
        messages=[
            {"role": "system", "content": "You are a helpful cooking assistant. Your job is to structure recipes given an image or website."},
            {"role": "user", "content": req.message},
        ],
        response_format=Recipe
    )

    reply = completion.choices[0].message.content
    return ChatResponse(reply=reply)

@app.post("/scrape-pinterest", response_model=ScrapedRecipeResponse)
async def scrape_pinterest(req: PinterestRequest):
    try:
        # Scrape the Pinterest link (blocking IO; run in threadpool)
        scraped_data = await asyncio.to_thread(scrape_pinterest_link, req.url)
        rprint(scraped_data)

        # Structure the recipe using OpenAI
        completion = await client.chat.completions.parse(
            model="gpt-4o-mini",
            messages=[
                {"role": "system", "content": "You are a helpful cooking assistant. Your job is to structure recipes from scraped website text. Extract all ingredients with their quantities and units, and all instruction steps."},
                {"role": "user", "content": scraped_data["raw_text"]},
            ],
            response_format=Recipe
        )
        
        recipe_data = completion.choices[0].message.parsed
        
        return ScrapedRecipeResponse(
            recipe=recipe_data,
            source_url=scraped_data["source_url"],
            source_image=scraped_data.get("source_image")
        )
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@app.post("/scrape-website", response_model=ScrapedRecipeResponse)
async def scrape_recipe_website(req: WebsiteRequest):
    try:
        # Scrape the website (blocking IO; run in threadpool)
        scraped_data = await asyncio.to_thread(scrape_website, req.url)

        # Structure the recipe using OpenAI
        completion = await client.chat.completions.parse(
            model="gpt-4o-mini",
            messages=[
                {"role": "system", "content": "You are a helpful cooking assistant. Your job is to structure recipes from scraped website text. Extract all ingredients with their quantities and units, and all instruction steps."},
                {"role": "user", "content": scraped_data["raw_text"]},
            ],
            response_format=Recipe
        )
        
        recipe_data = completion.choices[0].message.parsed
        
        return ScrapedRecipeResponse(
            recipe=recipe_data,
            source_url=scraped_data["source_url"],
            source_image=scraped_data.get("source_image")
        )
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@app.post("/annotate-recipe", response_model=AnnotateRecipeResponse)
async def annotate_recipe(req: AnnotateRecipeRequest):
    """
    Annotate recipe instructions with ingredient references.
    Uses AI to identify where ingredients are mentioned in instructions
    and creates annotations in the format: ${raw_text, ingredient_text}
    """
    try:
        # Build the prompt
        ingredients_list = "\n".join([f"- {ing}" for ing in req.ingredients])
        instructions_list = "\n".join([f"{i+1}. {inst}" for i, inst in enumerate(req.instructions)])
        
        system_prompt = f"""
        You are a recipe annotation assistant. Your job is to identify where ingredients are mentioned in recipe instructions and annotate them.
For each instruction, identify any mentions of ingredients from the ingredients list. When you find an ingredient mention, wrap it in the format: ${{raw_text, ingredient_text}}

Where:
- raw_text: The exact text as it appears in the instruction
- ingredient_text: The matching text from the ingredients list

Examples:
- "Add the eggs" → "Add the ${{eggs, 2 large eggs}}"
- "Whisk in milk" → "Whisk in ${{milk, 1 cup whole milk}}"
- "Mix the flour and sugar" → "Mix the ${{flour, 2 cups all-purpose flour}} and ${{sugar, 1 cup granulated sugar}}"

Rules:
1. Only annotate ingredients that are in the ingredients list
2. Use the EXACT text from the instruction for raw_text
3. Use the EXACT text from the ingredients list for ingredient_text
4. If an ingredient is mentioned multiple times, annotate each occurrence
5. Be flexible with matching (e.g., "eggs" matches "2 large eggs", "milk" matches "1 cup whole milk")
6. Return the full annotated instruction for each step
7. If you cannot find any matches, return the original text.

Example output:
[
  {{
    "original": "In a large bowl, whisk the eggs",
    "annotated": "In a large bowl, whisk the ${{eggs, 2 large eggs}}"
  }}
]"""

        prompt = f"""
INGREDIENTS LIST:
{ingredients_list}

INSTRUCTIONS:
{instructions_list}
"""

        # Call OpenAI
        completion = await client.chat.completions.parse(
            model="gpt-4o-mini",
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": prompt},
            ],
            response_format=AnnotateRecipeResponse
        )
        
        result = completion.choices[0].message.content
        result = AnnotateRecipeResponse.model_validate_json(result)
        
        return result
        
    except Exception as e:
        rprint(f"[red]Error annotating recipe: {e}[/red]")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/analyze-recipe", response_model=RecipeInsightResponse)
async def analyze_recipe(req: RecipeInsightRequest):
    """
    Analyze a recipe based on user's dietary restrictions and preferences.
    Returns insights about dietary compliance and recommends tools if needed.
    """
    try:
        # Build ingredients list
        ingredients_text = "\n".join([
            f"- {ing.text}"
            for ing in req.recipe.ingredients
        ])
        
        # Build dietary restrictions text
        dietary_restrictions = req.user_profile.dietary_restrictions or []
        restrictions_text = ", ".join(dietary_restrictions) if dietary_restrictions else "None specified"
        
        # Build available tools list for the prompt
        available_tools = req.available_tools or []
        if available_tools:
            tools_text = "\n".join([
                f'- "{tool.name}": {tool.description}'
                for tool in available_tools
            ])
        else:
            # Fallback to default tool
            tools_text = '- "suggest_substitutions": When ingredients conflict with dietary restrictions'
        
        system_prompt = f"""You are a helpful cooking assistant that analyzes recipes for dietary compliance.

Your job is to:
1. Analyze the recipe ingredients against the user's dietary restrictions
2. Identify any potential conflicts or concerns
3. Provide helpful, friendly insights
4. Recommend a tool if the user needs to make changes

Available tools:
{tools_text}
- null: When no tools are needed

Guidelines:
- Be concise but friendly (1-2 sentences max)
- Focus on dietary restriction compliance
- If there are conflicts, be specific about which ingredients are problematic
- If the recipe is compliant, keep it simple and encouraging (e.g., "Enjoy your meal!", "This looks great!", "Happy cooking!")
- Do NOT explain why no tools are needed when the recipe is compliant
- Only recommend a tool if it's truly helpful for the user
- Return the exact tool name from the available tools list, or null

Example outputs:
{{
  "insight": "This recipe contains dairy and gluten. The cheese and flour conflict with your Vegan and Gluten-Free restrictions.",
  "recommended_tool": "suggest_substitutions"
}}

{{
  "insight": "Enjoy your meal!",
  "recommended_tool": null
}}

{{
  "insight": "This looks delicious! Happy cooking!",
  "recommended_tool": null
}}"""

        user_prompt = f"""Analyze this recipe for dietary compliance:

RECIPE: {req.recipe.title}

INGREDIENTS:
{ingredients_text}

USER'S DIETARY RESTRICTIONS: {restrictions_text}

Provide your analysis."""
        # Call OpenAI with structured output
        completion = await client.chat.completions.parse(
            model="gpt-4o-mini",
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt},
            ],
            response_format=RecipeInsight
        )
        
        result = completion.choices[0].message.parsed
        
        return RecipeInsightResponse(
            insight=result.insight,
            recommended_tool=result.recommended_tool
        )
        
    except Exception as e:
        rprint(f"[red]Error analyzing recipe: {e}[/red]")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/execute-tool", response_model=ExecuteToolResponse)
async def execute_tool(req: ExecuteToolRequest):
    """
    Execute an AI tool on a recipe to generate a modified version.
    Uses the tool's prompt to guide the transformation.
    """
    try:
        # Build the system prompt based on the tool
        system_prompt = f"""You are a helpful cooking assistant that modifies recipes based on user needs.

Your task: {req.tool.description}

Guidelines:
- Maintain the original recipe structure
- Make appropriate modifications based on the tool's purpose
- Keep the recipe practical and achievable
- Preserve the cooking times unless they need to change
- Update ingredient quantities and instructions as needed
- Return a complete, valid recipe

Tool context: {req.tool.prompt}"""

        # Build ingredients list for context
        ingredients_text = "\n".join([
            f"- {ing.text}"
            for ing in req.recipe.ingredients
        ])
        
        # Build instructions list
        instructions_text = "\n".join([
            f"{i+1}. {step}"
            for i, step in enumerate(req.recipe.instructions)
        ])

        # Build user guidance section if provided
        guidance_section = ""
        if req.user_guidance and req.user_guidance.strip():
            guidance_section = f"\n\nUser's Additional Guidance: {req.user_guidance}\nPlease incorporate this guidance into your modifications."
        
        # Build AI reasoning section if provided
        reasoning_section = ""
        if req.ai_reasoning and req.ai_reasoning.strip():
            reasoning_section = f"\n\nChef Gnocchi's Analysis: {req.ai_reasoning}\nConsider this analysis when making modifications."
        
        user_prompt = f"""Original Recipe: {req.recipe.title}

Ingredients:
{ingredients_text}

Instructions:
{instructions_text}

Metadata:
- Prep Time: {req.recipe.metadata.prep_time} minutes
- Cook Time: {req.recipe.metadata.cook_time} minutes
- Servings: {req.recipe.metadata.servings}

Notes: {req.recipe.notes or 'None'}{reasoning_section}{guidance_section}

Please modify this recipe according to the tool's purpose. Return a complete recipe with all fields filled out."""

        rprint(f"[cyan]Executing tool: {req.tool.name}[/cyan]")
        rprint(f"[dim]Original recipe: {req.recipe.title}[/dim]")
        rprint(system_prompt)
        rprint(user_prompt)

        # Call OpenAI with structured output
        completion = await client.chat.completions.parse(
            model="gpt-4o-mini",
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt},
            ],
            response_format=Recipe
        )
        
        modified_recipe = completion.choices[0].message.parsed
        
        rprint(f"[green]✓ Generated modified recipe: {modified_recipe}[/green]")
        
        return ExecuteToolResponse(recipe=modified_recipe)
        
    except Exception as e:
        rprint(f"[red]Error executing tool: {e}[/red]")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/parse-recipe-image", response_model=Recipe)
async def parse_recipe_image(
    image: UploadFile = File(...),
    userId: str = Form(...)
):
    """
    Parse a recipe from an image using OpenAI Vision API.
    Accepts image as multipart form data.
    Returns structured recipe data matching the Recipe model.
    """
    try:
        rprint(f"[cyan]Parsing recipe from uploaded image for user: {userId}[/cyan]")
        
        # Read image file and encode to base64
        image_bytes = await image.read()
        base64_image = base64.b64encode(image_bytes).decode('utf-8')
        
        # Determine image format from content type
        image_format = image.content_type.split('/')[-1] if image.content_type else 'jpeg'
        data_url = f"data:image/{image_format};base64,{base64_image}"
        
        rprint(f"[dim]Image size: {len(image_bytes)} bytes, format: {image_format}[/dim]")
        
        # Use OpenAI Vision API with structured outputs (same as scrape endpoints)
        completion = await client.beta.chat.completions.parse(
            model="gpt-4o",
            messages=[
                {
                    "role": "system",
                    "content": """You are a helpful cooking assistant. Your job is to structure recipes from images. 
                    Extract all ingredients with their quantities and units, and all instruction steps.
                    
                    For each ingredient, parse:
                    - text: The ingredient name as written (e.g., "sugar", "flour", "chicken breast") - DO NOT include quantity or unit
                    - quantity: The numeric amount (use 0 if not specified)
                    - unit: The unit of measurement (use empty string if not specified)
                    
                    Extract metadata including prep time, cook time, and servings.
                    If any metadata is not visible, use reasonable defaults (0 for times, 1 for servings)."""
                },
                {
                    "role": "user",
                    "content": [
                        {
                            "type": "text",
                            "text": "Please extract the recipe from this image."
                        },
                        {
                            "type": "image_url",
                            "image_url": {
                                "url": data_url
                            }
                        }
                    ]
                }
            ],
            response_format=Recipe
        )
        
        recipe_data = completion.choices[0].message.parsed
        
        rprint(f"[green]✓ Successfully parsed recipe: {recipe_data.title}[/green]")
        
        return recipe_data
        
    except Exception as e:
        rprint(f"[red]Error parsing recipe image: {e}[/red]")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/generate-shopping-list", response_model=ShoppingListResponse)
async def generate_shopping_list(
    recipe_list: list[Recipe]
):
    """
    Takes a list of recipes and generates a shopping list for them.
    """
    try:
        rprint(f"[cyan]Generating shopping list for recipes[/cyan]")
        user_prompt = f"""Please generate a shopping list for these recipes.
        
        Recipe List: {recipe_list}"""
        rprint(user_prompt)

        completion = await client.beta.chat.completions.parse(
            model="gpt-4o",
            messages=[
                {
                    "role": "system",
                    "content": """You are a shopping assistant. Your job is to generate a shopping list for a list of recipes.
                    
                    Qualities of a good shopping list:
                    - Aggregation: Try to aggregate the ingredients and quantities. For example, if one recipe calls for 2 cups of flour and another calls for 1 cup of flour, you should only list flour once.
                    - Smart Quantities: Generally, we are not looking for quantities, however, if it makes sense to list a quantity, do so in a vague way. For example, if the recipes altogether need many onions, list "bag of onions".
                    - Concision: Try to convey a lot of information in a concise manner. For example, if a recipe calls for diced onion, you should just list onion.
                    - Sources: With each ingredient, try to list the title of the recipe that its from.
                    """
                },
                {
                    "role": "user",
                    "content": [
                        {
                            "type": "text",
                            "text": user_prompt
                        }
                    ]
                }
            ],
            response_format=ShoppingListResponse
        )
        
        recipe_data = completion.choices[0].message.parsed
        
        rprint(f"[green]✓ Successfully generated shopping list: {recipe_data}[/green]")
        
        return recipe_data
        
    except Exception as e:
        rprint(f"[red]Error parsing recipe image: {e}[/red]")
        raise HTTPException(status_code=500, detail=str(e))

