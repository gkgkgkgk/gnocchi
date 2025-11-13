import { convertDecimalsToFractions, formatQuantityAsFraction } from './fraction-formatter';

// Example usage and test cases
console.log('=== Fraction Formatter Examples ===\n');

// Test convertDecimalsToFractions (for full text)
console.log('Text conversion:');
console.log(convertDecimalsToFractions('0.5 cups flour')); // → "½ cups flour"
console.log(convertDecimalsToFractions('1.5 cups sugar')); // → "1½ cups sugar"
console.log(convertDecimalsToFractions('0.25 tsp salt')); // → "¼ tsp salt"
console.log(convertDecimalsToFractions('2.75 cups milk')); // → "2¾ cups milk"
console.log(convertDecimalsToFractions('0.33 cup water')); // → "⅓ cup water"
console.log(convertDecimalsToFractions('0.66 cup oil')); // → "⅔ cup oil"

console.log('\nQuantity formatting:');
console.log(formatQuantityAsFraction(0.5)); // → "½"
console.log(formatQuantityAsFraction(1.5)); // → "1½"
console.log(formatQuantityAsFraction(2.75)); // → "2¾"
console.log(formatQuantityAsFraction(3)); // → "3"

console.log('\nEdge cases:');
console.log(convertDecimalsToFractions('Add 2 eggs')); // → "Add 2 eggs" (no decimals)
console.log(convertDecimalsToFractions('Mix for 3.5 minutes')); // → "Mix for 3½ minutes"
console.log(convertDecimalsToFractions('')); // → ""
console.log(formatQuantityAsFraction(null)); // → ""
