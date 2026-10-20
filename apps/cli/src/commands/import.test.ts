import { describe, expect, it } from "vitest";
import { openDb, partsRepository } from "@parts-warehouse/db";
import { importParts } from "./import.js";

const core =
  "Code,Module,Module name,Sub-assembly,Sub-assembly name,Group,Group name," +
  "Part,Revision,Part name,Qty per build";
const printed = [
  `${core},Colour / material,File version,File path,Notes`,
  "A01-001-001,A,Chassis,A01,Tracks,001,Grousers,01,0,Grouser,40,Black PETG,v1.95,tracks/grouser.stl,",
  'A01-001-002,A,Chassis,A01,Tracks,001,Grousers,02,1,"Pin, long",80,TPU,,,Spare',
].join("\n");
const purchased = [
  `${core},Part type,Packs,Supplier link,Supplier,Colour code,Notes`,
  "A20-002-001,A,Chassis,A20,Hardware,002,Bearings,01,0,6810ZZ bearing,2,purchased,1,https://example.com/1,AliExpress,RAL9005,Sprocket",
  "B20-009-001,B,Cab,B20,Hardware,009,Lighting,01,0,LED pods,7,Purchased,2,,AliExpress,,",
].join("\n");

describe("importParts", () => {
  it("creates groupings and parts from the parts index", () => {
    const db = openDb(":memory:");
    expect(importParts(db, printed)).toEqual({
      parts: 2,
      module: 1,
      subassembly: 1,
      group: 1,
      skippedColumns: [],
    });
    const part = partsRepository(db).getPart("A01-001-002");
    expect(part).toMatchObject({
      name: "Pin, long",
      groupId: "A01-001",
      qtyPerBuild: 80,
      notes: "Spare",
      partTypeId: "printed",
    });
    expect(part?.attributes).toMatchObject({ colour: "Black", material: "TPU" });
    expect(partsRepository(db).getPart("A01-001-001")?.attributes).toMatchObject({
      file_version: "v1.95",
      file_path: "tracks/grouser.stl",
    });
  });

  it("keeps a part's type when the CSV has no Part type column", () => {
    const db = openDb(":memory:");
    const repo = partsRepository(db);
    importParts(db, printed);
    repo.updatePart("A01-001-001", { partTypeId: "purchased" });
    importParts(db, printed);
    expect(repo.getPart("A01-001-001")?.partTypeId).toBe("purchased");
  });

  it("sets the part type by id or name and matches attributes by key or label", () => {
    const db = openDb(":memory:");
    const result = importParts(db, purchased);
    expect(result).toMatchObject({ parts: 2, module: 2, skippedColumns: ["Colour code"] });
    const repo = partsRepository(db);
    expect(repo.getPart("A20-002-001")).toMatchObject({ partTypeId: "purchased" });
    expect(repo.getPart("A20-002-001")?.attributes).toMatchObject({
      packs: 1,
      supplier_url: "https://example.com/1",
      supplier: "AliExpress",
    });
    expect(repo.getPart("B20-009-001")?.partTypeId).toBe("purchased");
  });

  it("clears an attribute when its cell is empty", () => {
    const db = openDb(":memory:");
    const repo = partsRepository(db);
    importParts(db, purchased);
    importParts(db, purchased.replace("https://example.com/1", ""));
    expect(repo.getPart("A20-002-001")?.attributes.supplier_url).toBeUndefined();
  });

  it("rejects an unknown part type, naming the row", () => {
    expect(() => importParts(openDb(":memory:"), purchased.replace(",purchased,", ",bolts,"))).toThrow(
      'Row 2 (A20-002-001): unknown part type "bolts"',
    );
  });

  it("rejects an invalid attribute value, naming the row", () => {
    expect(() => importParts(openDb(":memory:"), purchased.replace(",purchased,1,", ",purchased,lots,"))).toThrow(
      /^Row 2 \(A20-002-001\): Packs to buy: /,
    );
  });

  it("keeps on hand and status when re-run", () => {
    const db = openDb(":memory:");
    const repo = partsRepository(db);
    importParts(db, printed);
    repo.updatePart("A01-001-001", { onHand: 12, status: "completed" });
    importParts(db, printed);
    expect(repo.getPart("A01-001-001")).toMatchObject({ onHand: 12, status: "completed" });
  });

  it("rejects a CSV with a missing core column", () => {
    expect(() => importParts(openDb(":memory:"), "Code,Module\nA,B")).toThrow(
      'CSV is missing "Module name"',
    );
  });
});
