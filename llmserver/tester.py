recipe = """Simple and Quick Garlic Mayo Recipe

A flavorful touch for sandwiches and more, this garlic mayo is both safe and tasty with store-bought convenience

By John Mitzewich Updated on 07/24/25
Tested by Colleen Graham
(166)
Write a Review
Print
Prep:
5 mins
Cook:
0 mins
Total:
5 mins
Servings:
8 servings
166 ratings
 Add a comment

Save
Recipe
Today, aioli (“EH-oh-lee”) commonly refers to any garlic-flavored mayonnaise. Originating in the Mediterranean, it is often identical to mayo in color and texture. In fact, some historians believe aioli gave birth to mayonnaise.

The term "aioli" is used interchangeably with mayonnaise on many restaurant menus, which can lead to confusion. However, aioli is different from mayonnaise because it contains garlic by definition. Mayonnaise, on the other hand, does not and often contains an acid like lemon juice or vinegar, while aioli traditionally does not. Note: Though you might see it called "aioli sauce" or "aioli mayo," this is technically redundant because "aioli" itself indicates a mayo-like sauce.

shortcut aioli in a bowl
The Spruce/Bahareh Niati
Depending on how much garlic it contains, the flavor of aioli can range from subtle to very strong. Traditionally, raw garlic is used, often in large amounts. However, aioli should not taste harsh or raw, due to the fineness of the garlic paste and the emulsion formed with the oil.

In Catalonia, in the north of Spain where aioli is traditionally found, it consists simply of garlic, olive oil, and salt. There, it is spelled "allioli" or "alioli" in Catalan or Spanish, respectively, meaning "garlic and oil." Eggs are not part of its preparation; instead, the garlic is minced to a paste using a mortar and pestle, and the oil is incorporated slowly until a beautifully opaque emulsion forms. This is similar to toum, a Lebanese sauce made of garlic, oil, salt, and lemon juice. Both preparations are traditionally egg-free and vegan.

In Provence, in the south of France, aioli is also popular. There, it commonly includes egg yolks and sometimes even mustard. The Catalonian version is more garlicky, while the French version is less so, but still more garlicky than typical American versions.

This recipe uses store-bought mayonnaise, cutting down on preparation time, effort, as well as risks of salmonella. Store-bought mayonnaise often uses pasteurized eggs to reduce the risk of foodborne illness. Because this recipe does not contain raw eggs, it is safer for immune-compromised and pregnant women to eat.1

Enjoy this aioli simply with good crusty bread, as is customary in Spain. Or pair it with grilled seafood, steamed artichoke hearts, or the spiced fried potatoes that are patatas bravas.

What You'll Need To Make This Aioli Recipe
Amazon John Boos Block Chop-N-Slice Maple Wood Cutting Board
A Sturdy Cutting Board
Misen 8-Inch Chefâs Knife
A Sharp Knife
KitchenAid Citrus Juice Press Squeezer
A Handy Citrus Juicer
Never Lose a Recipe Again!
Love a Spruce Eats recipe? With MyRecipes, your personal home for recipes, easily save and organize your favorites, plus thousands more, in one convenient place.
"Despite its simplicity, this is a very flavorful version of aioli. After just 30 minutes refrigerated, the garlic flavor was perfectly developed and created a delicious sandwich spread and veggie dip. Execution is easy. Be patient working the garlic and salt into a paste. It takes time and effort." —Colleen Graham

Shortcut Aioli/Tester Image
A Note From Our Recipe Tester

Cook Mode (Keep screen awake)
Ingredients
3 cloves garlic
Kosher salt, as needed
1 cup mayonnaise
2 1/2 teaspoons fresh lemon juice
Steps to Make It
Gather the ingredients.

ingredients to make shortcut aioli (garlic mayo) recipe
The Spruce Eats / Bahareh Niati
Crush three garlic cloves with the flat side of a knife, and remove the skins. Then, mince the garlic very finely.

chopped garlic on cutting board with knife
The Spruce Eats / Bahareh Niati
Add a pinch of salt, and using the flat of the knife again, scrape and press the garlic against the cutting surface to create a paste that is as smooth as possible. Creating this paste from the fresh garlic is what gives aioli its intense garlic flavor.

Note that making a smooth paste is key to the success of this sauce. If you don't spend a few minutes on this step, you will be left with small bits of raw and harsh-tasting garlic, which will not do justice to the magic of aioli.

smashed garlic on a cutting board with salt and knife
The Spruce Eats / Bahareh Niati
Add the garlic to a small bowl, and whisk together with 1 cup of mayonnaise, 2 1/2 teaspoons of fresh lemon juice, and 1/4 teaspoon of salt. Cover and refrigerate for 30 minutes to allow the flavors to develop.

mayo, lemon juice and garlic in a bowl
The Spruce Eats / Bahareh Niati
How To Store Garlic Aioli
The shelf life of store-bought mayonnaise is up to two months in the fridge, per Foodsafety.gov. An aioli like this one should have a similar refrigerated shelf life, perhaps a little less. It depends on how often you take it out of the fridge to use it, the coldness of your fridge (be sure not to overcrowd your fridge, as cold air should be able to flow around items adequately), and whether bacteria is introduced (always use a dry, clean spoon). Homemade aioli without eggs will keep for seven to ten days in the fridge; homemade aioli with raw eggs will keep for two to three days in the fridge.

Recipe Variations
Roasted Garlic Aioli - Roast the garlic before mincing it and add it to the aioli to create a softer, sweeter, more gentle flavor. This variation is great for chicken, sandwiches, or dipping french fries. 
Lemon Pepper Aioli - Add 1 1/2 to 2 tablespoons more lemon juice, some lemon zest, and 1 to 2 teaspoons of freshly ground black pepper. Mix to combine. This aioli is wonderful for lamb, chicken, or sandwiches.
Mixed Herb Aioli -Chop 1/4 to 1/3 cup of fresh herbs like parsley, chives, or dill and add them to the aioli. Mix to combine. This variation is a treat for any sandwich.
Cilantro Lime Aioli - Combine 1 tablespoon of freshly squeezed lime juice with 1/4 cup of chopped cilantro and mix it with the aioli base. This variation is wonderful on a quesadilla or any Mexican-inspired dish.
Chipotle Lime - Mince 2 chipotle peppers in adobo sauce and combine them with the aioli base from this recipe, 2 teaspoons of freshly squeezed lime juice, and 1 1/2 to 2 teaspoons of chopped chives. This option is a lovely addition to a grilled chicken sandwich or for dipping delicious sweet potato fries.
Rosemary Aioli - Chop 2 sprigs of fresh rosemary and add them to the aioli. Stir to combine. This aioli pairs well with any type of meat, and it works wonderfully for meatballs."""


import urllib.request
import json
from scrape import scrape_pinterest_link
from rich import print as rprint
from rich.console import Console

console = Console()

API_URL = "http://127.0.0.1:8001/structure-recipe"

def chat_with_api(message: str):
    recipe = scrape_pinterest_link("https://www.pinterest.com/pin/333196072452746243/")
    console.print((recipe['raw_text']))
    payload = {"message": recipe["raw_text"]}
    data = json.dumps(payload).encode("utf-8")

    req = urllib.request.Request(
        API_URL,
        data=data,
        headers={"Content-Type": "application/json"},
        method="POST"
    )

    with urllib.request.urlopen(req) as resp:
        resp_data = resp.read().decode("utf-8")
        result = json.loads(resp_data)
        return json.loads(result["reply"])

reply = chat_with_api(recipe)
rprint(reply)