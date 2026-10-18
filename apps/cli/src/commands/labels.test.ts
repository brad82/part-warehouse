import { describe, expect, it } from "vitest";
import {
  labelTemplatesRepository,
  loadLabelTemplateFiles,
  openDb,
} from "@snowcat/db";
import { AVERY_5160 } from "@snowcat/shared";
import { config } from "../config.js";
import { importParts } from "./import.js";
import {
  assertFitsSheet,
  renderLabelsPdf,
  selectParts,
  selectTemplate,
} from "./labels.js";

const csv = [
  "Code,Module,Module name,Sub-assembly,Sub-assembly name,Group,Group name,Part,Revision,Part name,Qty per build,Notes",
  "A01-001-001,A,Chassis,A01,Tracks,001,Grousers,01,0,Grouser,40,",
  "A01-001-002,A,Chassis,A01,Tracks,001,Grousers,02,0,Pin,80,",
  "A02-001-001,A,Chassis,A02,Blade,001,Plates,01,0,Blade plate,1,",
].join("\n");

function db() {
  const d = openDb(":memory:");
  importParts(d, csv);
  labelTemplatesRepository(d).ensureBuiltins(
    loadLabelTemplateFiles(config.labelTemplatesDir),
  );
  return d;
}

const pageCount = (pdf: Buffer) =>
  pdf.toString("latin1").match(/\/Type \/Page\b/g)?.length;

describe("selectParts", () => {
  it("combines codes and query, without duplicates, sorted by code", () => {
    const parts = selectParts(db(), {
      codes: ["A02-001-001", "A01-001-001"],
      query: "Tracks",
    });
    expect(parts.map((p) => p.code)).toEqual([
      "A01-001-001",
      "A01-001-002",
      "A02-001-001",
    ]);
  });

  it("rejects unknown codes and an empty selection", () => {
    expect(() => selectParts(db(), { codes: ["A09-999-999"] })).toThrow(
      "A09-999-999",
    );
    expect(() => selectParts(db(), { codes: [] })).toThrow();
  });
});

describe("selectTemplate", () => {
  it("finds a built-in and names the choices for an unknown id", () => {
    expect(selectTemplate(db(), "small").name).toBe("Small label");
    expect(() => selectTemplate(db(), "nope")).toThrow(
      'Unknown template "nope". Templates: bag, small',
    );
  });

  it("only accepts templates that fit a sheet slot", () => {
    expect(() =>
      assertFitsSheet(selectTemplate(db(), "small"), AVERY_5160),
    ).not.toThrow();
    expect(() =>
      assertFitsSheet(selectTemplate(db(), "bag"), AVERY_5160),
    ).toThrow("62×100mm");
  });
});

describe("renderLabelsPdf", () => {
  it("writes a PDF, overflowing onto a second sheet", async () => {
    const d = db();
    const parts = selectParts(d, { codes: [], query: "A0" });
    const template = selectTemplate(d, "small");
    const one = await renderLabelsPdf(parts, { template, start: 1 });
    expect(one.pdf.subarray(0, 4).toString()).toBe("%PDF");
    expect(one.pages).toBe(1);

    const two = await renderLabelsPdf(parts, { template, start: 29 });
    expect(two.pages).toBe(2);
    expect(pageCount(two.pdf)).toBe(2);
  });
});
