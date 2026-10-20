import { attrNumber, type Part } from "@parts-warehouse/shared";

export const PRICE_KEY = "price";

export type InventoryMetrics = {
  /** Share of one build's parts on hand, 0–1. Surplus stock doesn't count. */
  inventoryPct: number;
  /** Sum of on-hand quantities. */
  onHandCount: number;
  /** On-hand quantity × price, over parts that have a price. */
  onHandValue: number;
  /** Parts with stock but no price, so missing from the value. */
  unpricedInStock: number;
};

/** Headline inventory numbers across all parts. Pure; no formatting. */
export function inventoryMetrics(
  parts: Pick<Part, "qtyPerBuild" | "onHand" | "attributes">[],
): InventoryMetrics {
  let needed = 0;
  let covered = 0;
  let onHandCount = 0;
  let onHandValue = 0;
  let unpricedInStock = 0;

  for (const part of parts) {
    needed += part.qtyPerBuild;
    covered += Math.min(part.onHand, part.qtyPerBuild);
    onHandCount += part.onHand;
    const price = attrNumber(part, PRICE_KEY);
    if (price != null) onHandValue += part.onHand * price;
    else if (part.onHand > 0) unpricedInStock += 1;
  }

  return {
    inventoryPct: needed ? covered / needed : 0,
    onHandCount,
    onHandValue: Math.round(onHandValue * 100) / 100,
    unpricedInStock,
  };
}
