import { describe, expect, it } from "vitest";
import { inventoryMetrics } from "./metrics";

const part = (qtyPerBuild: number, onHand: number, price?: number) => ({
  qtyPerBuild,
  onHand,
  attributes: (price == null ? {} : { price }) as Record<string, number>,
});

describe("inventoryMetrics", () => {
  it("caps coverage at qty per build and sums count and value", () => {
    const m = inventoryMetrics([part(10, 5, 2.5), part(4, 6, 1), part(6, 0)]);
    // covered 5 + 4 + 0 of 20 needed
    expect(m.inventoryPct).toBe(0.45);
    expect(m.onHandCount).toBe(11);
    expect(m.onHandValue).toBe(18.5);
    expect(m.unpricedInStock).toBe(0);
  });

  it("counts stocked parts without a price", () => {
    expect(inventoryMetrics([part(2, 3), part(2, 0)]).unpricedInStock).toBe(1);
  });

  it("returns zeros for no parts", () => {
    expect(inventoryMetrics([])).toEqual({
      inventoryPct: 0,
      onHandCount: 0,
      onHandValue: 0,
      unpricedInStock: 0,
    });
  });
});
