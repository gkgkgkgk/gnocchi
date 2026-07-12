/**
 * Approximate ingredient densities in **grams per millilitre**, for crossing
 * weight↔volume (e.g. 200 g flour ≈ 1.6 cups). Cooking densities vary with
 * packing/humidity, so these are sensible kitchen averages, not lab values.
 *
 * Recipe ingredients are free-text, so we match by keyword against the
 * ingredient name (longest match wins, so "brown sugar" beats "sugar").
 */

const DENSITY_G_PER_ML: Record<string, number> = {
  // Liquids / near-water
  water: 1.0,
  milk: 1.03,
  'heavy cream': 1.0,
  cream: 1.0,
  'olive oil': 0.91,
  oil: 0.92,
  'vegetable oil': 0.92,
  butter: 0.96,
  'melted butter': 0.96,
  honey: 1.42,
  'maple syrup': 1.33,
  'corn syrup': 1.38,
  molasses: 1.4,
  yogurt: 1.03,
  'sour cream': 1.0,
  'soy sauce': 1.15,
  vinegar: 1.01,
  wine: 0.99,

  // Dry / baking (spooned & leveled)
  'all-purpose flour': 0.53,
  'bread flour': 0.55,
  'cake flour': 0.45,
  'whole wheat flour': 0.55,
  flour: 0.53,
  'granulated sugar': 0.85,
  'white sugar': 0.85,
  'brown sugar': 0.9, // packed
  'powdered sugar': 0.56,
  'confectioners sugar': 0.56,
  sugar: 0.85,
  'cocoa powder': 0.51,
  cornstarch: 0.54,
  'baking powder': 0.9,
  'baking soda': 0.92,
  salt: 1.2,
  'kosher salt': 0.69,
  rice: 0.85,
  'rolled oats': 0.41,
  oats: 0.41,
  'chopped nuts': 0.5,
  'peanut butter': 1.09,
  'cream cheese': 1.0,
  ketchup: 1.14,
  mayonnaise: 0.91,
  'grated parmesan': 0.42,

  // Spices (fine ground)
  cinnamon: 0.45,
  cumin: 0.5,
  paprika: 0.46,
  'black pepper': 0.5,
};

/** Longest-keyword-wins density lookup, or null if unknown. */
export function densityFor(name: string | null | undefined): number | null {
  if (!name) return null;
  const s = name.toLowerCase();
  let best: { key: string; d: number } | null = null;
  for (const [key, d] of Object.entries(DENSITY_G_PER_ML)) {
    if (s.includes(key) && (!best || key.length > best.key.length)) {
      best = { key, d };
    }
  }
  return best ? best.d : null;
}
