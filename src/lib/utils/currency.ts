/**
 * Currency formatting utilities
 * API returns amounts in lowest currency unit (kobo for Naira)
 * Need to divide by 100 to get main currency unit
 */

/**
 * Convert kobo to Naira (divide by 100)
 */
export function koboToNaira(kobo: number): number {
  return kobo / 100;
}

/**
 * Format amount as Nigerian Naira currency
 * @param amount - Amount in kobo (from API)
 * @param options - Intl.NumberFormat options
 */
export function formatNaira(
  amount: number,
  options?: Intl.NumberFormatOptions
): string {
  const naira = koboToNaira(amount);
  return new Intl.NumberFormat('en-NG', {
    style: 'currency',
    currency: 'NGN',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
    ...options,
  }).format(naira);
}

/**
 * Format amount as Nigerian Naira without currency symbol
 * @param amount - Amount in kobo (from API)
 */
export function formatNairaAmount(amount: number): string {
  const naira = koboToNaira(amount);
  return new Intl.NumberFormat('en-NG', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(naira);
}

/**
 * Format amount with custom separator (for display like "₦300,000")
 * This function assumes amount is in kobo and divides by 100
 */
export function formatNairaWithSymbol(amount: number): string {
  return `₦${formatNairaAmount(amount)}`;
}

/**
 * Format amount that is already in Naira (no conversion needed)
 * Use this when the API returns amounts directly in Naira
 */
export function formatNairaDirect(amount: number): string {
  return new Intl.NumberFormat('en-NG', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

/**
 * Format amount with ₦ symbol when amount is already in Naira
 * Use this for displaying amounts that don't need kobo conversion
 */
export function formatNairaWithSymbolDirect(amount: number): string {
  return `₦${formatNairaDirect(amount)}`;
}

