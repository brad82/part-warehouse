import { describe, expect, it } from "vitest";
import type { Grouping, Part } from "@parts-warehouse/shared";
import { groupingRows } from "./groupingRows";

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

describe("groupingRows", () => {
  it("orders depth-first and totals parts upwards", () => {
    const groupings = [
      g("A", "module", null),
      g("A01", "subassembly", "A"),
      g("A01-001", "group", "A01"),
      g("A01-002", "group", "A01"),
      g("B", "module", null),
    ];
    const parts = [{ groupId: "A01-001" }, { groupId: "A01-001" }] as Part[];
    expect(
      groupingRows(groupings, parts).map((r) => [
        r.grouping.id,
        r.depth,
        r.children,
        r.parts,
      ]),
    ).toEqual([
      ["A", 0, 1, 2],
      ["A01", 1, 2, 2],
      ["A01-001", 2, 0, 2],
      ["A01-002", 2, 0, 0],
      ["B", 0, 0, 0],
    ]);
  });
});
