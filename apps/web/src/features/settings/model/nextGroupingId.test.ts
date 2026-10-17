import { describe, expect, it } from "vitest";
import type { Grouping } from "@snowcat/shared";
import { nextGroupingId } from "./nextGroupingId";

const g = (
  id: string,
  taxonomy: Grouping["taxonomy"],
  parentId: string | null,
): Grouping => ({
  id,
  taxonomy,
  name: id,
  revision: 0,
  parentId,
});

const groupings = [
  g("A", "module", null),
  g("A01", "subassembly", "A"),
  g("A02", "subassembly", "A"),
  g("A20", "subassembly", "A"),
  g("A01-001", "group", "A01"),
  g("A01-002", "group", "A01"),
];

describe("nextGroupingId", () => {
  it("picks the next unused module letter", () => {
    expect(nextGroupingId(groupings, "module", null)).toBe("B");
  });

  it("fills the lowest gap under a module", () => {
    expect(nextGroupingId(groupings, "subassembly", "A")).toBe("A03");
  });

  it("numbers groups with three digits", () => {
    expect(nextGroupingId(groupings, "group", "A01")).toBe("A01-003");
    expect(nextGroupingId(groupings, "group", "A02")).toBe("A02-001");
  });

  it("returns null when every code is taken", () => {
    const full = Array.from({ length: 99 }, (_, i) =>
      g(`A${String(i + 1).padStart(2, "0")}`, "subassembly", "A"),
    );
    expect(nextGroupingId(full, "subassembly", "A")).toBeNull();
  });
});
