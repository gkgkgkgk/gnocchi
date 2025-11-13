import requests
import json
from rich import print as rprint
# Test data
test_recipe = {
    "instructions": [
  "Preheat the oven to 325°F.",
  "Lightly spray an 8x8 baking dish (not a 9x9 dish or your brownies will overcook) with cooking spray and line it with parchment paper.",
  "Spray the parchment paper.",
  "In a medium bowl, combine the sugar, flour, cocoa powder, powdered sugar, chocolate chips, and salt.",
  "In a large bowl, whisk together the eggs, olive oil, water, and vanilla.",
  "Sprinkle the dry mix over the wet mix and stir until just combined.",
  "Pour the batter into the prepared pan (it'll be thick - that's ok) and use a spatula to smooth the top.",
  "Bake for 40 to 48 minutes, or until a toothpick comes out with only a few crumbs attached (note: it's better to pull the brownies out early than to leave them in too long).",
  "Cool completely before slicing."
],
"ingredients": [
    "granulated sugar",
    "all-purpose flour",
    "cocoa powder",
    "powdered sugar",
    "dark chocolate chips",
    "sea salt",
    "large eggs",
    "canola oil or extra-virgin olive oil",
    "water",
    "vanilla"
]
}

# Make request
response = requests.post(
    "http://localhost:8001/annotate-recipe",
    json=test_recipe
)

# Print results
if response.status_code == 200:
    result = response.json()
    rprint(result)
else:
    rprint(f"❌ Error: {response.status_code}")
    rprint(response.text)
