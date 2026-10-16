import { describe, expect, it } from "vitest";
import type { Grouping, Part } from "@snowcat/shared";
import { buildRows } from "./buildRows";

const groupings: Grouping[] = [
  { id: "A", taxonomy: "module", name: "Chassis", revision: 0, parentId: null },
  { id: "A01", taxonomy: "subassembly", name: "Tracks", revision: 0, parentId: "A" },
  { id: "A01-001", taxonomy: "group", name: "Grousers", revision: 0, parentId: "A01" },
];

const part: Part = {
  code: "A01-001-001",
  groupId: "A01-001",
  part: "01",
  revision: 0,
  name: "Left Inner Grouser 2",
  partTypeId: "printed",
  qtyPerBuild: 12,
  notes: null,
  onHand: 5,
  attributes: { colour: "Black", material: "PETG", print_time_min: 30 },
  status: "planned",
  source: "csv",
  updatedAt: "2026-10-16T00:00:00.000Z",
};

describe("buildRows", () => {
  it("adds grouping names and per-build totals", () => {
    const [row] = buildRows(groupings, [part], [{ id: "printed", name: "Printed", sort: 1 }]);
    expect(row).toMatchObject({
      partType: "Printed",
      subassembly: "A01 Tracks",
      group: "A01-001 Grousers",
      remaining: 7,
      totalPrintTimeMin: 360,
      totalFilamentG: null,
    });
  });

  it("leaves names blank when the group is unknown", () => {
    const [row] = buildRows([], [part]);
    expect(row.subassembly).toBe("");
    expect(row.group).toBe("");
  });
});
