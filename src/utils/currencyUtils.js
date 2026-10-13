// Centralized PKR currency formatting for DineHQ

export const CURRENCY_SYMBOL = 'Rs.';
export const CURRENCY_CODE = 'PKR';

/**
 * Formats a numeric value into clean PKR currency format:
 * e.g. 1250 -> "Rs. 1,250"
 * e.g. 850.5 -> "Rs. 850.50"
 */
export function formatPKR(amount) {
  const num = Number(amount) || 0;
  // If it's a whole number, don't show trailing decimals (.00)
  const hasDecimals = num % 1 !== 0;
  const formatted = num.toLocaleString('en-PK', {
    minimumFractionDigits: hasDecimals ? 2 : 0,
    maximumFractionDigits: 2,
  });
  return `Rs. ${formatted}`;
}

/**
 * Formats with full PKR code:
 * e.g. 1250 -> "PKR 1,250"
 */
export function formatPKRCode(amount) {
  const num = Number(amount) || 0;
  const hasDecimals = num % 1 !== 0;
  const formatted = num.toLocaleString('en-PK', {
    minimumFractionDigits: hasDecimals ? 2 : 0,
    maximumFractionDigits: 2,
  });
  return `PKR ${formatted}`;
}

/**
 * Formats raw number with commas:
 * e.g. 1250 -> "1,250"
 */
export function formatAmount(amount) {
  const num = Number(amount) || 0;
  const hasDecimals = num % 1 !== 0;
  return num.toLocaleString('en-PK', {
    minimumFractionDigits: hasDecimals ? 2 : 0,
    maximumFractionDigits: 2,
  });
}
