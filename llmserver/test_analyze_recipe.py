"""
Test script for the /analyze-recipe endpoint
"""
import requests
from rich import print as rprint

# API endpoint
API_URL = "http://localhost:8001/analyze-recipe"

# Available AI tools (simulating what would come from the database)
AVAILABLE_TOOLS = [
    {
        "name": "suggest_substitutions",
        "description": "Find ingredient substitutions based on dietary restrictions",
        "prompt": "When ingredients conflict with dietary restrictions"
    },
    {
        "name": "scale_recipe",
        "description": "Adjust recipe quantities for different serving sizes",
        "prompt": "When the user wants to change the number of servings"
    },
    {
        "name": "simplify_instructions",
        "description": "Make cooking instructions easier to follow",
        "prompt": "When instructions are complex or unclear"
    },
    {
        "name": "cooking_tips",
        "description": "Get helpful tips and techniques for this recipe",
        "prompt": "When the user could benefit from cooking advice"
    }
]

# Test case 1: Recipe with dietary conflicts
test_recipe_1 = {
    "recipe": {
        "title": "Classic Mac and Cheese",
        "ingredients": [
            {"text": "1 lb elbow macaroni", "quantity": 1.0, "unit": "lb"},
            {"text": "4 cups shredded cheddar cheese", "quantity": 4.0, "unit": "cups"},
            {"text": "3 cups whole milk", "quantity": 3.0, "unit": "cups"},
            {"text": "1/2 cup butter", "quantity": 0.5, "unit": "cup"},
            {"text": "1/2 cup all-purpose flour", "quantity": 0.5, "unit": "cup"},
            {"text": "1 tsp salt", "quantity": 1.0, "unit": "tsp"},
            {"text": "1/2 tsp black pepper", "quantity": 0.5, "unit": "tsp"}
        ],
        "instructions": [
            "Cook pasta according to package directions",
            "Make a roux with butter and flour",
            "Add milk and cheese, stir until melted",
            "Combine with pasta and serve"
        ],
        "notes": "",
        "metadata": {
            "prep_time": 10,
            "cook_time": 20,
            "servings": 6
        }
    },
    "user_profile": {
        "display_name": "John",
        "dietary_restrictions": ["Vegan", "Gluten-Free"],
        "favorite_food": "Pizza"
    },
    "available_tools": AVAILABLE_TOOLS
}

# Test case 2: Recipe that's compliant
test_recipe_2 = {
    "recipe": {
        "title": "Roasted Vegetable Medley",
        "ingredients": [
            {"text": "2 cups broccoli florets", "quantity": 2.0, "unit": "cups"},
            {"text": "2 cups cauliflower florets", "quantity": 2.0, "unit": "cups"},
            {"text": "1 cup cherry tomatoes", "quantity": 1.0, "unit": "cup"},
            {"text": "3 tbsp olive oil", "quantity": 3.0, "unit": "tbsp"},
            {"text": "1 tsp garlic powder", "quantity": 1.0, "unit": "tsp"},
            {"text": "1 tsp salt", "quantity": 1.0, "unit": "tsp"},
            {"text": "1/2 tsp black pepper", "quantity": 0.5, "unit": "tsp"}
        ],
        "instructions": [
            "Preheat oven to 425°F",
            "Toss vegetables with olive oil and seasonings",
            "Spread on baking sheet",
            "Roast for 25-30 minutes until tender"
        ],
        "notes": "",
        "metadata": {
            "prep_time": 10,
            "cook_time": 30,
            "servings": 4
        }
    },
    "user_profile": {
        "display_name": "Sarah",
        "dietary_restrictions": ["Vegetarian", "Dairy-Free"],
        "favorite_food": "Salad"
    },
    "available_tools": AVAILABLE_TOOLS
}

# Test case 3: No dietary restrictions
test_recipe_3 = {
    "recipe": {
        "title": "Grilled Chicken Breast",
        "ingredients": [
            {"text": "4 chicken breasts", "quantity": 4.0, "unit": ""},
            {"text": "2 tbsp olive oil", "quantity": 2.0, "unit": "tbsp"},
            {"text": "1 tsp paprika", "quantity": 1.0, "unit": "tsp"},
            {"text": "1 tsp garlic powder", "quantity": 1.0, "unit": "tsp"},
            {"text": "1 tsp salt", "quantity": 1.0, "unit": "tsp"}
        ],
        "instructions": [
            "Season chicken with spices",
            "Grill for 6-7 minutes per side",
            "Let rest before serving"
        ],
        "notes": "",
        "metadata": {
            "prep_time": 5,
            "cook_time": 15,
            "servings": 4
        }
    },
    "user_profile": {
        "display_name": "Mike",
        "dietary_restrictions": [],
        "favorite_food": "Steak"
    },
    "available_tools": AVAILABLE_TOOLS
}

def test_endpoint(test_case, case_name):
    """Test the analyze-recipe endpoint with a test case"""
    rprint(f"\n[bold cyan]{'='*60}[/bold cyan]")
    rprint(f"[bold yellow]Testing: {case_name}[/bold yellow]")
    rprint(f"[bold cyan]{'='*60}[/bold cyan]\n")
    
    rprint(f"[bold]Recipe:[/bold] {test_case['recipe']['title']}")
    rprint(f"[bold]Dietary Restrictions:[/bold] {test_case['user_profile']['dietary_restrictions']}")
    
    try:
        response = requests.post(API_URL, json=test_case)
        response.raise_for_status()
        
        result = response.json()
        
        rprint(f"\n[bold green]✓ Success![/bold green]")
        rprint(f"\n[bold]AI Insight:[/bold]")
        rprint(f"  {result['insight']}")
        rprint(f"\n[bold]Recommended Tool:[/bold]")
        rprint(f"  {result['recommended_tool'] or 'None'}")
        
    except requests.exceptions.ConnectionError:
        rprint("[bold red]✗ Error: Could not connect to API server[/bold red]")
        rprint("[yellow]Make sure the server is running: uvicorn main:app --reload[/yellow]")
    except requests.exceptions.HTTPError as e:
        rprint(f"[bold red]✗ HTTP Error: {e}[/bold red]")
        rprint(f"Response: {response.text}")
    except Exception as e:
        rprint(f"[bold red]✗ Error: {e}[/bold red]")

if __name__ == "__main__":
    rprint("[bold magenta]Recipe Analysis API Test Script[/bold magenta]")
    rprint("[dim]Testing /analyze-recipe endpoint[/dim]\n")
    
    # Run all test cases
    test_endpoint(test_recipe_1, "Case 1: Recipe with Conflicts (Vegan + Gluten-Free)")
    test_endpoint(test_recipe_2, "Case 2: Compliant Recipe (Vegetarian + Dairy-Free)")
    test_endpoint(test_recipe_3, "Case 3: No Dietary Restrictions")
    
    rprint(f"\n[bold cyan]{'='*60}[/bold cyan]")
    rprint("[bold green]All tests completed![/bold green]")
    rprint(f"[bold cyan]{'='*60}[/bold cyan]\n")
