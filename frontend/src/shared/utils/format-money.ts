import { LAKHS_PER_CRORE } from "../const/auction.const";

/**
 * Formats an amount in lakhs for display. Amounts from ₹1cr up read in crores
 * with two decimals, and smaller amounts read in lakhs. Storage stays in lakhs,
 * so formatting happens only here, at render time (ADR 0004).
 *
 * @param lakhs - The amount, as a whole number of lakhs.
 * @returns A string such as `"₹1.50cr"` or `"₹40L"`.
 */
export function formatLakhs(lakhs: number): string {
  if (lakhs >= LAKHS_PER_CRORE) {
    return `₹${(lakhs / LAKHS_PER_CRORE).toFixed(2)}cr`;
  }
  return `₹${lakhs}L`;
}
