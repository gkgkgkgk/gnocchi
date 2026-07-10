/**
 * Converts a decimal number to a fraction string if it matches common fractions
 */
export function decimalToFraction(decimal: number): string {
  const whole = Math.floor(decimal);
  const remainder = decimal - whole;

  if (remainder === 0) {
    return whole.toString();
  }

  // Common fractions mapping
  const fractions: [number, string][] = [
    [1/16, '1/16'], [1/8, '1/8'], [3/16, '3/16'], [1/4, '1/4'],
    [5/16, '5/16'], [3/8, '3/8'], [7/16, '7/16'], [1/2, '1/2'],
    [9/16, '9/16'], [5/8, '5/8'], [11/16, '11/16'], [3/4, '3/4'],
    [13/16, '13/16'], [7/8, '7/8'], [15/16, '15/16']
  ];

  // Find matching fraction (with small tolerance for floating point errors)
  const tolerance = 0.01;
  for (const [value, fraction] of fractions) {
    if (Math.abs(remainder - value) < tolerance) {
      return whole > 0 ? `${whole} ${fraction}` : fraction;
    }
  }

  // If no match found, return decimal
  return decimal.toString();
}

/**
 * Pluralizes a unit name based on quantity
 */
export function pluralizeUnit(unit: string, quantity: number): string {
  // Convert to number in case it's a string
  const numQuantity = typeof quantity === 'string' ? parseFloat(quantity) : quantity;
  
  if (numQuantity === 1) {
    return unit;
  }

  // Common irregular plurals
  const irregulars: Record<string, string> = {
    'leaf': 'leaves',
    'half': 'halves',
    'loaf': 'loaves',
  };

  const lowerUnit = unit.toLowerCase();
  
  if (irregulars[lowerUnit]) {
    return irregulars[lowerUnit];
  }

  // Words ending in 'ch', 'sh', 's', 'x', 'z' add 'es'
  if (/(ch|sh|s|x|z)$/i.test(unit)) {
    return unit + 'es';
  }

  // Words ending in consonant + 'y' change 'y' to 'ies'
  if (/[^aeiou]y$/i.test(unit)) {
    return unit.slice(0, -1) + 'ies';
  }

  // Default: just add 's'
  return unit + 's';
}

/**
 * Formats an ingredient line for display
 */
export function formatIngredientLine(
  quantity: number,
  unitName: string | undefined,
  ingredientName: string
): string {
  // No (or zero) quantity — the ingredient was entered without an amount
  // (e.g. "brown sugar", "salt to taste"). Show just the name rather than a
  // meaningless "0 brown sugar".
  const numQuantity = typeof quantity === 'string' ? parseFloat(quantity) : quantity;
  if (!numQuantity || Number.isNaN(numQuantity) || numQuantity <= 0) {
    return ingredientName;
  }

  const formattedQuantity = decimalToFraction(quantity);

  if (!unitName || unitName.trim() === '') {
    // No unit, just quantity and ingredient
    return `${formattedQuantity} ${ingredientName}`;
  }

  const pluralizedUnit = pluralizeUnit(unitName, quantity);
  // Add "of" between unit and ingredient
  return `${formattedQuantity} ${pluralizedUnit} of ${ingredientName}`;
}
