"""
Test script for the /execute-tool endpoint
"""
import requests
from rich import print as rprint

# API endpoint
API_URL = "http://localhost:8001/execute-tool"

# Test recipe
test_recipe = {
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
}

# Test tools
test_tools = [
    {
        "name": "suggest_substitutions",
        "description": "Find ingredient substitutions based on dietary restrictions",
        "prompt": "Make this recipe vegan-friendly by replacing all dairy products with plant-based alternatives"
    },
    {
        "name": "scale_recipe",
        "description": "Adjust recipe quantities for different serving sizes",
        "prompt": "Scale this recipe to serve 12 people instead of the current serving size"
    },
    {
        "name": "simplify_instructions",
        "description": "Make cooking instructions easier to follow",
        "prompt": "Simplify the instructions to make them easier for beginner cooks to follow"
    }
]

def test_tool_execution(tool, tool_name):
    """Test the execute-tool endpoint with a specific tool"""
    rprint(f"\n[bold cyan]{'='*60}[/bold cyan]")
    rprint(f"[bold yellow]Testing Tool: {tool_name}[/bold yellow]")
    rprint(f"[bold cyan]{'='*60}[/bold cyan]\n")
    
    rprint(f"[bold]Original Recipe:[/bold] {test_recipe['title']}")
    rprint(f"[bold]Tool:[/bold] {tool['name']}")
    rprint(f"[bold]Task:[/bold] {tool['description']}")
    
    try:
        response = requests.post(API_URL, json={
            "recipe": test_recipe,
            "tool": tool
        })
        response.raise_for_status()
        
        result = response.json()
        modified_recipe = result['recipe']
        
        rprint(f"\n[bold green]✓ Success![/bold green]")
        rprint(f"\n[bold]Modified Recipe Title:[/bold]")
        rprint(f"  {modified_recipe['title']}")
        
        rprint(f"\n[bold]Modified Ingredients:[/bold]")
        for ing in modified_recipe['ingredients']:
            rprint(f"  • {ing['text']}")
        
        rprint(f"\n[bold]Modified Instructions:[/bold]")
        for i, step in enumerate(modified_recipe['instructions'], 1):
            rprint(f"  {i}. {step}")
        
        rprint(f"\n[bold]Metadata:[/bold]")
        metadata = modified_recipe['metadata']
        rprint(f"  Prep Time: {metadata['prep_time']} min")
        rprint(f"  Cook Time: {metadata['cook_time']} min")
        rprint(f"  Servings: {metadata['servings']}")
        
        if modified_recipe.get('notes'):
            rprint(f"\n[bold]Notes:[/bold]")
            rprint(f"  {modified_recipe['notes']}")
        
    except requests.exceptions.ConnectionError:
        rprint("[bold red]✗ Error: Could not connect to API server[/bold red]")
        rprint("[yellow]Make sure the server is running: uvicorn main:app --reload --port 8001[/yellow]")
    except requests.exceptions.HTTPError as e:
        rprint(f"[bold red]✗ HTTP Error: {e}[/bold red]")
        rprint(f"Response: {response.text}")
    except Exception as e:
        rprint(f"[bold red]✗ Error: {e}[/bold red]")

if __name__ == "__main__":
    rprint("[bold magenta]AI Tool Execution Test Script[/bold magenta]")
    rprint("[dim]Testing /execute-tool endpoint[/dim]\n")
    
    # Test each tool
    for i, tool in enumerate(test_tools, 1):
        test_tool_execution(tool, f"Test {i}: {tool['name']}")
    
    rprint(f"\n[bold cyan]{'='*60}[/bold cyan]")
    rprint("[bold green]All tests completed![/bold green]")
    rprint(f"[bold cyan]{'='*60}[/bold cyan]\n")
