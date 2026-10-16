import { describe, expect, it } from "vitest";
import type { CatalogRow } from "./buildRows";
import { rowUpdate } from "./rowUpdate";

const row = {
  code: "A01-001-001",
  onHand: 2,
  status: "planned",
  name: "Grouser",
} as CatalogRow;

describe("rowUpdate", () => {
  it("returns only the changed editable fields", () => {
    expect(rowUpdate({ ...row, onHand: 5, name: "x" }, row)).toEqual({ onHand: 5 });
    expect(rowUpdate({ ...row, status: "completed" }, row)).toEqual({
      status: "completed",
    });
  });

  it("returns null when nothing changed", () => {
    expect(rowUpdate({ ...row }, row)).toBeNull();
  });

  it("rejects invalid values", () => {
    expect(() => rowUpdate({ ...row, onHand: -1 }, row)).toThrow(/Invalid onHand/);
    expect(() => rowUpdate({ ...row, onHand: 1.5 }, row)).toThrow();
  });
});
