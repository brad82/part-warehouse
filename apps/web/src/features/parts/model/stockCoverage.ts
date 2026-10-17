/**
 * Share of one build's quantity on hand, 0–1. Surplus stock doesn't count;
 * a part needing none counts as covered once any is in stock.
 */
export function stockCoverage(onHand: number, qtyPerBuild: number): number {
  if (qtyPerBuild <= 0) return onHand > 0 ? 1 : 0;
  return Math.min(onHand / qtyPerBuild, 1);
}
