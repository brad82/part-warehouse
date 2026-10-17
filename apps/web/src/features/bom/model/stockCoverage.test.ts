import { describe, expect, it } from "vitest";
import { stockCoverage } from "./stockCoverage";

describe("stockCoverage", () => {
  it("is the share of one build on hand", () => {
    expect(stockCoverage(0, 4)).toBe(0);
    expect(stockCoverage(3, 4)).toBe(0.75);
    expect(stockCoverage(4, 4)).toBe(1);
  });

  it("caps surplus stock at 1", () => {
    expect(stockCoverage(10, 4)).toBe(1);
  });

  it("treats a part needing none as covered once stocked", () => {
    expect(stockCoverage(0, 0)).toBe(0);
    expect(stockCoverage(2, 0)).toBe(1);
  });
});
