/**
 * Converts decimal numbers to fractions in text
 * Examples:
 * - "0.5 cups" -> "½ cups"
 * - "1.5 cups" -> "1½ cups"
 * - "0.25 tsp" -> "¼ tsp"
 * - "2.75 cups" -> "2¾ cups"
 */

// Common fraction mappings
const FRACTION_MAP: { [key: string]: string } = {
  '0.25': '¼',
  '0.33': '⅓',
  '0.333': '⅓',
  '0.5': '½',
  '0.66': '⅔',
  '0.666': '⅔',
  '0.67': '⅔',
  '0.75': '¾',
  '0.125': '⅛',
  '0.375': '⅜',
  '0.625': '⅝',
  '0.875': '⅞',
  '0.2': '⅕',
  '0.4': '⅖',
  '0.6': '⅗',
  '0.8': '⅘',
};

/**
 * Converts a decimal number to a fraction string
 * @param num - The number to convert
 * @returns The fraction representation
 */
function decimalToFraction(num: number): string {
  const whole = Math.floor(num);
  const decimal = num - whole;
  
  // If no decimal part, return the whole number
  if (decimal === 0) {
    return whole.toString();
  }
  
  // Round to 3 decimal places to handle floating point precision
  const roundedDecimal = Math.round(decimal * 1000) / 1000;
  const decimalStr = roundedDecimal.toString();
  
  // Check if we have a direct mapping
  const fraction = FRACTION_MAP[decimalStr];
  
  if (fraction) {
    return whole > 0 ? `${whole}${fraction}` : fraction;
  }
  
  // No clean fraction — cap at 2 decimals (trailing zeros stripped) so we
  // don't render long tails like "236.588235".
  return String(Math.round(num * 100) / 100);
}

/**
 * Converts all decimal numbers in a text string to fractions
 * @param text - The text to process
 * @returns Text with decimals converted to fractions
 */
export function convertDecimalsToFractions(text: string): string {
  if (!text) return text;
  
  // Match decimal numbers (e.g., "0.5", "1.25", "2.75")
  // This regex matches numbers with optional whole part and decimal part
  const decimalRegex = /\b(\d+\.?\d*)\b/g;
  
  return text.replace(decimalRegex, (match) => {
    const num = parseFloat(match);
    
    // Only convert if it's a valid number and has a decimal part
    if (isNaN(num) || num === Math.floor(num)) {
      return match;
    }
    
    return decimalToFraction(num);
  });
}

/**
 * Formats a quantity value to a fraction string
 * Useful for displaying ingredient quantities
 * @param quantity - The quantity number
 * @returns Formatted fraction string
 */
export function formatQuantityAsFraction(quantity: number | string | null | undefined): string {
  if (quantity === null || quantity === undefined || quantity === '') {
    return '';
  }
  
  const num = typeof quantity === 'string' ? parseFloat(quantity) : quantity;
  
  if (isNaN(num)) {
    return quantity.toString();
  }
  
  return decimalToFraction(num);
}
