import { describe, expect, it } from "vitest";
import { openDb } from "@snowcat/db";
import { importParts } from "./import.js";
import { renderLabelsPdf, selectParts } from "./labels.js";

const csv = [
  "Code,Module,Module name,Sub-assembly,Sub-assembly name,Group,Group name,Part,Revision,Part name,Qty per build,Notes",
  "A01-001-001,A,Chassis,A01,Tracks,001,Grousers,01,0,Grouser,40,",
  "A01-001-002,A,Chassis,A01,Tracks,001,Grousers,02,0,Pin,80,",
  "A02-001-001,A,Chassis,A02,Blade,001,Plates,01,0,Blade plate,1,",
].join("\n");

function db() {
  const d = openDb(":memory:");
  importParts(d, csv);
  return d;
}

const pageCount = (pdf: Buffer) => pdf.toString("latin1").match(/\/Type \/Page\b/g)?.length;

describe("selectParts", () => {
  it("combines codes and query, without duplicates, sorted by code", () => {
    const parts = selectParts(db(), { codes: ["A02-001-001", "A01-001-001"], query: "Tracks" });
    expect(parts.map((p) => p.code)).toEqual(["A01-001-001", "A01-001-002", "A02-001-001"]);
  });

  it("rejects unknown codes and an empty selection", () => {
    expect(() => selectParts(db(), { codes: ["A09-999-999"] })).toThrow("A09-999-999");
    expect(() => selectParts(db(), { codes: [] })).toThrow();
  });
});

describe("renderLabelsPdf", () => {
  it("writes a PDF, overflowing onto a second sheet", async () => {
    const parts = selectParts(db(), { codes: [], query: "A0" });
    const one = await renderLabelsPdf(parts, { start: 1 });
    expect(one.pdf.subarray(0, 4).toString()).toBe("%PDF");
    expect(one.pages).toBe(1);

    const two = await renderLabelsPdf(parts, { start: 29 });
    expect(two.pages).toBe(2);
    expect(pageCount(two.pdf)).toBe(2);
  });
});
