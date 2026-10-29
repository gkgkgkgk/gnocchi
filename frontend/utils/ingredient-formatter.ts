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

  // No clean fraction — show a plain number capped at 2 decimals (trailing
  // zeros stripped) so converted amounts don't read like "236.588235".
  return String(Math.round(decimal * 100) / 100);
}

// Abbreviations and words that read the same at any amount ("2 tbsp", not "2 tbsps").
const INVARIANT_UNITS = new Set([
  'tsp', 'tbsp', 'tbs', 'oz', 'fl oz', 'lb', 'lbs', 'g', 'kg', 'mg', 'ml', 'l', 'dl', 'cl',
  'pt', 'qt', 'gal', 'ea', 'dz', 'each', 'dozen', 'c', 't',
]);

const IRREGULAR_PLURALS: Record<string, string> = { leaf: 'leaves', half: 'halves', loaf: 'loaves' };

function singularUnit(unit: string): string {
  const lower = unit.toLowerCase();
  const irregular = Object.keys(IRREGULAR_PLURALS).find((s) => IRREGULAR_PLURALS[s] === lower);
  if (irregular) return irregular;
  if (/(ch|sh|x|z|ss)es$/i.test(unit)) return unit.slice(0, -2);
  if (/[^aeiou]ies$/i.test(unit)) return unit.slice(0, -3) + 'y';
  if (/[^su]s$/i.test(unit)) return unit.slice(0, -1);
  return unit;
}

/**
 * The unit's form for an amount: singular up to 1 ("1/2 cup", "1 clove"),
 * plural above it ("2 cloves"). Accepts either form as input.
 */
export function pluralizeUnit(unit: string, quantity: number): string {
  if (INVARIANT_UNITS.has(unit.toLowerCase())) return unit;
  const singular = singularUnit(unit);
  const numQuantity = typeof quantity === 'string' ? parseFloat(quantity) : quantity;
  if (!(numQuantity > 1)) return singular;

  const irregular = IRREGULAR_PLURALS[singular.toLowerCase()];
  if (irregular) return irregular;
  if (/(ch|sh|s|x|z)$/i.test(singular)) return singular + 'es';
  if (/[^aeiou]y$/i.test(singular)) return singular.slice(0, -1) + 'ies';
  return singular + 's';
}

/** Every spelling of a unit worth recognizing at the start of a line. */
function unitForms(unit: string): string[] {
  const singular = singularUnit(unit);
  return [unit, singular, pluralizeUnit(singular, 2)];
}

const FRACTION_CHARS = '¼½¾⅓⅔⅛⅜⅝⅞';
// Mixed numbers and fractions come first so "1/2" isn't read as "1".
const AMOUNT = `(?:\\d+\\s+\\d+/\\d+|\\d+/\\d+|\\d+(?:[.,]\\d+)?(?:\\s*[${FRACTION_CHARS}])?|[${FRACTION_CHARS}])`;
const LEADING_AMOUNT = new RegExp(`^${AMOUNT}(?:\\s*(?:-|–|—|to)\\s*${AMOUNT})?\\s*`, 'i');

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Strip a leading amount and unit from an ingredient's text, for recipes
 * whose text is the whole line as written ("1/2 cup Orange Juice") while the
 * amount and unit are also stored separately. Leaves text without one alone.
 */
export function stripLeadingAmount(text: string, unit?: string | null): string {
  const original = (text ?? '').trim();
  let name = original.replace(LEADING_AMOUNT, '');
  if (unit) {
    const forms = unitForms(unit).map(escapeRegExp).join('|');
    name = name.replace(new RegExp(`^(?:${forms})\\.?(?=\\s|$)\\s*`, 'i'), '');
  }
  name = name.replace(/^of\s+/i, '').trim();
  return name || original;
}

/**
 * The amount part of an ingredient line, like "1/3 cup" or "2 cloves".
 * Empty when there's no amount (e.g. "salt to taste").
 */
export function formatAmount(quantity: number, unitName: string | undefined): string {
  const numQuantity = typeof quantity === 'string' ? parseFloat(quantity) : quantity;
  if (!numQuantity || Number.isNaN(numQuantity) || numQuantity <= 0) return '';
  const formattedQuantity = decimalToFraction(numQuantity);
  if (!unitName || unitName.trim() === '') return formattedQuantity;
  return `${formattedQuantity} ${pluralizeUnit(unitName.trim(), numQuantity)}`;
}

/**
 * Split ingredients into display groups by their `section`. Consecutive
 * ingredients sharing a section form one group; ungrouped ones get null.
 * Each entry keeps its index in the original list.
 */
export function groupBySection<T extends { section?: string | null }>(
  items: T[],
): { section: string | null; items: { item: T; index: number }[] }[] {
  const groups: { section: string | null; items: { item: T; index: number }[] }[] = [];
  items.forEach((item, index) => {
    const section = item.section?.trim() || null;
    const last = groups[groups.length - 1];
    if (last && last.section === section) last.items.push({ item, index });
    else groups.push({ section, items: [{ item, index }] });
  });
  return groups;
}
