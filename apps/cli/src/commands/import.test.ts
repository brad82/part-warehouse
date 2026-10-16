import { describe, expect, it } from "vitest";
import { openDb, partsRepository } from "@snowcat/db";
import { importPartsIndex } from "./import.js";

const header =
  "Code,Module,Module name,Sub-assembly,Sub-assembly name,Group,Group name," +
  "Part,Revision,Part name,Qty per build,Colour / material,File version,File path,Notes";
const csv = [
  header,
  "A01-001-001,A,Chassis,A01,Tracks,001,Grousers,001,0,Grouser,40,Black PETG,v1.95,tracks/grouser.stl,",
  'A01-001-002,A,Chassis,A01,Tracks,001,Grousers,002,1,"Pin, long",80,TPU,,,Spare',
].join("\n");

describe("importPartsIndex", () => {
  it("creates groupings and parts", () => {
    const db = openDb(":memory:");
    expect(importPartsIndex(db, csv)).toEqual({ parts: 2, module: 1, subassembly: 1, group: 1 });
    const part = partsRepository(db).getPart("A01-001-002");
    expect(part).toMatchObject({ name: "Pin, long", groupId: "A01-001", qtyPerBuild: 80, notes: "Spare" });
    expect(part?.attributes).toMatchObject({ material: "TPU" });
  });

  it("keeps on hand and status when re-run", () => {
    const db = openDb(":memory:");
    const repo = partsRepository(db);
    importPartsIndex(db, csv);
    repo.updatePart("A01-001-001", { onHand: 12, status: "completed" });
    importPartsIndex(db, csv);
    expect(repo.getPart("A01-001-001")).toMatchObject({ onHand: 12, status: "completed" });
  });

  it("rejects a CSV with a missing column", () => {
    expect(() => importPartsIndex(openDb(":memory:"), "Code,Module\nA,B")).toThrow(
      'Parts Index.csv is missing "Module name"',
    );
  });
});
