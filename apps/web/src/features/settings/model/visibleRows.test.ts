import { describe, expect, it } from "vitest";
import type { Grouping, Part } from "@snowcat/shared";
import { groupingRows } from "./groupingRows";
import { visibleRows } from "./visibleRows";

const g = (id: string, taxonomy: Grouping["taxonomy"], parentId: string | null, name = id): Grouping => ({
  id,
  taxonomy,
  name,
  revision: 0,
  parentId,
});

const rows = groupingRows(
  [
    g("A", "module", null, "Chassis"),
    g("A03", "subassembly", "A", "Chassis"),
    g("A03-001", "group", "A03", "Drivetrain"),
    g("A03-002", "group", "A03", "Frame"),
    g("A05", "subassembly", "A", "Push Frame"),
    g("A05-001", "group", "A05", "Actuators"),
    g("B", "module", null, "Cab"),
  ],
  [] as Part[],
);

const ids = (r: { rows: { grouping: Grouping }[] }) => r.rows.map((x) => x.grouping.id);

describe("visibleRows", () => {
  it("hides rows under a collapsed level", () => {
    expect(ids(visibleRows(rows, new Set(), ""))).toEqual(["A", "B"]);
    expect(ids(visibleRows(rows, new Set(["A"]), ""))).toEqual(["A", "A03", "A05", "B"]);
    expect(ids(visibleRows(rows, new Set(["A", "A03"]), ""))).toEqual([
      "A", "A03", "A03-001", "A03-002", "A05", "B",
    ]);
  });

  it("keeps a child hidden when only it is expanded", () => {
    expect(ids(visibleRows(rows, new Set(["A03"]), ""))).toEqual(["A", "B"]);
  });

  it("shows matches with their parents, all open, parents muted", () => {
    const result = visibleRows(rows, new Set(), " FRAME ");
    expect(result.searching).toBe(true);
    expect(result.matches).toBe(2);
    expect(result.rows.map((r) => [r.grouping.id, r.context, r.open])).toEqual([
      ["A", true, true],
      ["A03", true, true],
      ["A03-002", false, true],
      ["A05", false, true],
    ]);
  });

  it("matches on code", () => {
    expect(ids(visibleRows(rows, new Set(), "a05-"))).toEqual(["A", "A05", "A05-001"]);
  });

  it("returns nothing when nothing matches", () => {
    expect(visibleRows(rows, new Set(), "zzz")).toMatchObject({ matches: 0, rows: [] });
  });
});
