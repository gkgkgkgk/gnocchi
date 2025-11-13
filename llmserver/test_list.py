import requests
import json
from rich import print as rprint

# Test data
test_list = [
    {
        "title": "Abby's Famous Homemade Brownies",
        "ingredients": [
            {"text": "granulated sugar", "unit": "cup", "quantity": 1.5},
            {"text": "all-purpose flour", "unit": "cup", "quantity": 0.75},
            {"text": "cocoa powder", "unit": "cup", "quantity": 0.67},
            {"text": "powdered sugar", "unit": "cup", "quantity": 0.5},
            {"text": "dark chocolate chips", "unit": "cup", "quantity": 0.5},
            {"text": "sea salt", "unit": "tsp", "quantity": 0.75},
            {"text": "large eggs", "unit": "", "quantity": 2},
            {"text": "canola oil or extra-virgin olive oil", "unit": "cup", "quantity": 0.5},
            {"text": "water", "unit": "tbsp", "quantity": 2},
            {"text": "vanilla", "unit": "tsp", "quantity": 0.5}
        ],
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
        "notes": "*If you'd like to reduce the sugar, I've had success with 1 cup granulated sugar instead of 1 1/2 cups. **I like to use olive oil because it's what I keep on hand and I enjoy the pairing of olive oil with chocolate. For a more neutral flavor, use canola oil. ***When these brownies come out of the oven, they'll be super gooey in the middle. Allow them to cool completely, about 2 hours, before you slice them. Trust me, it's worth the wait!",
        "metadata": {"cook_time": 45, "prep_time": 15, "servings": 16}
    },
    {
        "title": "Apple Cake",
        "ingredients": [
            {"text": "sugar", "unit": "cup", "quantity": 1},
            {"text": "eggs", "unit": "", "quantity": 3},
            {"text": "flour", "unit": "cup", "quantity": 1},
            {"text": "oil", "unit": "cup", "quantity": 0.5},
            {"text": "vanilla", "unit": "tsp", "quantity": 1},
            {"text": "Granny apples (peeled and sliced)", "unit": "", "quantity": 2}
        ],
        "instructions": [
            "Mix sugar, eggs, flour, oil, and vanilla in a bowl.",
            "Add the peeled and sliced Granny apples.",
            "Top with cinnamon and brown sugar.",
            "Bake for 40 minutes."
        ],
        "notes": "",
        "metadata": {"cook_time": 40, "prep_time": 15, "servings": 8}
    },
    {
        "title": "Balsamic Roasted Root Vegetables",
        "ingredients": [
            {"text": "medium carrots", "unit": "", "quantity": 2},
            {"text": "small beets", "unit": "", "quantity": 2},
            {"text": "parsnip", "unit": "", "quantity": 1},
            {"text": "celeriac/celery root", "unit": "g", "quantity": 200},
            {"text": "balsamic vinegar", "unit": "tbsp", "quantity": 3},
            {"text": "olive oil", "unit": "tbsp", "quantity": 2},
            {"text": "honey", "unit": "tsp", "quantity": 3},
            {"text": "honey for glaze", "unit": "tsp", "quantity": 1},
            {"text": "dried mixed herbs", "unit": "tsp", "quantity": 1},
            {"text": "onion granules", "unit": "tsp", "quantity": 0.25},
            {"text": "garlic granules", "unit": "tsp", "quantity": 0.25},
            {"text": "fine sea salt", "unit": "tsp", "quantity": 0.33},
            {"text": "black pepper", "unit": "tsp", "quantity": 0.33},
            {"text": "dark soy sauce", "unit": "tsp", "quantity": 2}
        ],
        "instructions": [
            "Preheat the oven to 400 F/200 C/fan 190 C/gas mark 6.",
            "Line a large baking sheet with parchment paper and set aside.",
            "Make the balsamic mixture by combining the balsamic vinegar, olive oil, honey, mixed herbs, onion granules, garlic granules, salt, and pepper. Stir well and set aside.",
            "Peel or scrub the vegetables (the celeriac should ideally be peeled) and cut into similar size pieces.",
            "Place the vegetables in a large bowl (all except the beets), drizzle the balsamic dressing over them, and stir until all the vegetables are thoroughly coated.",
            "Arrange the vegetables on the baking sheet without overlapping one another (leave the leftover dressing in the bowl).",
            "Place the beets in the dressing mixture, coat thoroughly, and place them on the baking sheet separately from the other vegetables.",
            "Reserve the leftover balsamic dressing.",
            "Roast in the center of the oven for 30-35 minutes or until the vegetables are 95% cooked (still slightly underdone, check with a fork).",
            "About 15 minutes into the cooking time, remove the baking sheet from the oven and pour the reserved balsamic dressing over the vegetables. Stir well and return to the oven.",
            "Make the glaze by combining the honey and soy sauce. Stir well.",
            "Once the vegetables are cooked, remove them from the oven, drizzle the glaze over them, and stir to coat.",
            "Return to the oven for a final 5 minutes.",
            "Serve immediately."
        ],
        "notes": "",
        "metadata": {"cook_time": 40, "prep_time": 15, "servings": 4}
    }
]

# Make request
response = requests.post(
    "http://localhost:8001/generate-shopping-list",
    json=test_list
)

# Print results
if response.status_code == 200:
    result = response.json()
    rprint(result)
else:
    rprint(f"❌ Error: {response.status_code}")
    rprint(response.text)
