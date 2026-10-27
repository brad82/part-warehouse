import { afterEach, describe, expect, it } from "vitest";
import { openDb, partsRepository } from "@parts-warehouse/db";
import { buildServer } from "../app.js";
import type { PrintSystem } from "../lib/printers.js";

let app: Awaited<ReturnType<typeof buildServer>>;

type Job = Parameters<PrintSystem["print"]>[2] & { printer: string; pdf: Buffer };

async function start(withPrinter: boolean) {
  const db = openDb(":memory:");
  const repo = partsRepository(db);
  repo.upsertGrouping({ id: "A", taxonomy: "module", name: "Chassis", revision: 0, parentId: null });
  repo.upsertGrouping({ id: "A01", taxonomy: "subassembly", name: "Tracks", revision: 0, parentId: "A" });
  repo.upsertGrouping({ id: "A01-001", taxonomy: "group", name: "Grousers", revision: 0, parentId: "A01" });
  repo.upsertCatalogPart({
    code: "A01-001-001", groupId: "A01-001", part: "01", revision: 0, name: "Grouser",
    qtyPerBuild: 12, notes: null, source: "csv", attributes: {},
  });
  const jobs: Job[] = [];
  const printSystem: PrintSystem = {
    listPrinters: async () => [{ name: "Test_Printer", enabled: true, status: "idle" }],
    print: async (printer, pdf, opts) => void jobs.push({ printer, pdf, ...opts }),
  };
  app = await buildServer({ db, printSystem, logger: false });
  if (withPrinter) {
    await app.inject({
      method: "PUT",
      url: "/settings/label-printer",
      payload: { printer: "Test_Printer" },
    });
  }
  return jobs;
}

afterEach(() => app?.close());

const pdfPages = (body: Buffer) =>
  body.toString("latin1").match(/\/Type \/Page\b/g)?.length;

describe("labels routes", () => {
  it("renders a label-sized page per copy", async () => {
    await start(false);
    const res = await app.inject({
      method: "POST",
      url: "/labels/pdf",
      payload: { code: "A01-001-001", templateId: "bag", copies: 2 },
    });
    expect(res.statusCode).toBe(200);
    expect(res.headers["content-type"]).toBe("application/pdf");
    expect(res.rawPayload.subarray(0, 4).toString()).toBe("%PDF");
    expect(pdfPages(res.rawPayload)).toBe(2);
    // The bag template is the Dymo driver page: 58.76×101.6mm.
    expect(res.rawPayload.toString("latin1")).toMatch(/\/MediaBox \[0 0 166\.56\d* 288\]/);
  });

  it("404s an unknown part or template", async () => {
    await start(false);
    const part = await app.inject({
      method: "POST",
      url: "/labels/pdf",
      payload: { code: "A09-999-999", templateId: "bag" },
    });
    expect(part.statusCode).toBe(404);
    const template = await app.inject({
      method: "POST",
      url: "/labels/pdf",
      payload: { code: "A01-001-001", templateId: "nope" },
    });
    expect(template.statusCode).toBe(404);
  });

  it("sends one label to the printer with the copies and label size", async () => {
    const jobs = await start(true);
    expect((await app.inject("/capabilities")).json()).toMatchObject({
      labelPrinter: "Test_Printer",
    });
    const res = await app.inject({
      method: "POST",
      url: "/labels/print",
      payload: { code: "A01-001-001", templateId: "bag", copies: 3 },
    });
    expect(res.json()).toEqual({ printer: "Test_Printer", copies: 3 });
    expect(jobs).toHaveLength(1);
    expect(jobs[0]).toMatchObject({
      printer: "Test_Printer",
      widthMm: 58.76,
      heightMm: 101.6,
      copies: 3,
    });
    expect(pdfPages(jobs[0].pdf)).toBe(1);
  });

  it("refuses to print without a printer", async () => {
    await start(false);
    const res = await app.inject({
      method: "POST",
      url: "/labels/print",
      payload: { code: "A01-001-001", templateId: "bag" },
    });
    expect(res.statusCode).toBe(409);
  });
});
