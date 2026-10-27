import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { openDb } from "@parts-warehouse/db";
import { buildServer } from "../app.js";
import type { PrintSystem } from "../lib/printers.js";

let app: Awaited<ReturnType<typeof buildServer>>;

const printSystem: PrintSystem = {
  listPrinters: async () => [
    { name: "DYMO_LabelWriter_450", enabled: true, status: "Out of labels." },
    { name: "Office", enabled: false, status: "disabled" },
  ],
  print: async () => {},
};

beforeEach(async () => {
  app = await buildServer({ db: openDb(":memory:"), printSystem, logger: false });
});

afterEach(() => app.close());

const setPrinter = (printer: string | null) =>
  app.inject({ method: "PUT", url: "/settings/label-printer", payload: { printer } });

describe("printers routes", () => {
  it("lists the machine's printers", async () => {
    const res = await app.inject("/printers");
    expect(res.json()).toEqual(await printSystem.listPrinters());
  });

  it("starts with no label printer, so the browser prints", async () => {
    expect((await app.inject("/settings/label-printer")).json()).toEqual({ printer: null });
    expect((await app.inject("/capabilities")).json()).toMatchObject({ labelPrinter: null });
  });

  it("saves the label printer and reports it as a capability", async () => {
    expect((await setPrinter("DYMO_LabelWriter_450")).json()).toEqual({
      printer: "DYMO_LabelWriter_450",
    });
    expect((await app.inject("/settings/label-printer")).json()).toEqual({
      printer: "DYMO_LabelWriter_450",
    });
    expect((await app.inject("/capabilities")).json()).toMatchObject({
      labelPrinter: "DYMO_LabelWriter_450",
    });

    await setPrinter(null);
    expect((await app.inject("/capabilities")).json()).toMatchObject({ labelPrinter: null });
  });

  it("rejects a printer the machine doesn't have", async () => {
    const res = await setPrinter("Nope");
    expect(res.statusCode).toBe(400);
    expect((await app.inject("/settings/label-printer")).json()).toEqual({ printer: null });
  });
});
