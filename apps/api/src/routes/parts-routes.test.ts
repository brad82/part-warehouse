import { mkdtempSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { openDb, partsRepository } from "@snowcat/db";
import { buildServer } from "../app.js";

let app: Awaited<ReturnType<typeof buildServer>>;
let repo: ReturnType<typeof partsRepository>;
let opened: string[];
const base = {
  groupId: "A01-001", part: "01", revision: 0, qtyPerBuild: 12,
  notes: null, source: "csv",
};
const printed = (filePath: string) => ({
  colour: "Black", material: "PETG", file_version: null, file_path: filePath,
});

beforeEach(async () => {
  const modelFilesDir = mkdtempSync(path.join(os.tmpdir(), "model-files-"));
  writeFileSync(path.join(modelFilesDir, "grouser.stl"), "solid test");
  const db = openDb(":memory:");
  repo = partsRepository(db);
  repo.upsertGrouping({ id: "A", taxonomy: "module", name: "Chassis", revision: 0, parentId: null });
  repo.upsertGrouping({ id: "A01", taxonomy: "subassembly", name: "Tracks", revision: 0, parentId: "A" });
  repo.upsertGrouping({ id: "A01-001", taxonomy: "group", name: "Grousers", revision: 0, parentId: "A01" });
  repo.upsertCatalogPart({ ...base, code: "A01-001-001", name: "Grouser", attributes: printed("grouser.stl") });
  repo.upsertCatalogPart({ ...base, code: "A01-001-002", part: "02", name: "Escapee", attributes: printed("../../etc/passwd") });
  opened = [];
  const openInSlicer = async (file: string) => void opened.push(file);
  app = await buildServer({ db, modelFilesDir, openInSlicer, logger: false });
});

afterEach(() => app.close());

describe("parts routes", () => {
  it("searches by grouping name", async () => {
    const res = await app.inject("/parts?q=tracks");
    expect(res.json()).toHaveLength(2);
  });

  it("searches by attribute value", async () => {
    const res = await app.inject("/parts?q=escapee");
    expect(res.json()).toHaveLength(1);
    const byPath = await app.inject("/parts?q=grouser.stl");
    expect(byPath.json()).toHaveLength(1);
  });

  it("patches stock fields and keeps them across a catalog re-import", async () => {
    const res = await app.inject({
      method: "PATCH",
      url: "/parts/A01-001-001",
      payload: { onHand: 5, status: "completed", attributes: { print_time_min: "42" } },
    });
    expect(res.json()).toMatchObject({
      onHand: 5,
      status: "completed",
      attributes: { colour: "Black", print_time_min: 42 },
    });

    repo.upsertCatalogPart({ ...base, code: "A01-001-001", name: "Renamed", attributes: printed("grouser.stl") });
    expect(repo.getPart("A01-001-001")).toMatchObject({
      name: "Renamed",
      onHand: 5,
      status: "completed",
      attributes: { print_time_min: 42, file_path: "grouser.stl" },
    });
  });

  it("rejects invalid updates", async () => {
    const res = await app.inject({
      method: "PATCH",
      url: "/parts/A01-001-001",
      payload: { onHand: -1 },
    });
    expect(res.statusCode).toBe(400);
  });

  it("rejects invalid or unknown attribute values", async () => {
    const patch = (attributes: Record<string, unknown>) =>
      app.inject({ method: "PATCH", url: "/parts/A01-001-001", payload: { attributes } });
    expect((await patch({ print_time_min: "1.5" })).statusCode).toBe(400);
    expect((await patch({ material: "Cheese" })).statusCode).toBe(400);
    expect((await patch({ nope: "x" })).statusCode).toBe(400);
  });

  it("clears an attribute with null", async () => {
    const res = await app.inject({
      method: "PATCH",
      url: "/parts/A01-001-001",
      payload: { attributes: { colour: null } },
    });
    expect(res.json().attributes).not.toHaveProperty("colour");
  });

  it("creates a purchased part with the next free number", async () => {
    const next = await app.inject("/groupings/A01-001/next-part");
    expect(next.json()).toEqual({ part: "03" });

    const payload = {
      groupId: "A01-001", part: "03", revision: 0, name: "M3x8 bolt",
      partTypeId: "purchased", qtyPerBuild: 40,
      attributes: { sku: "BOLT-M3-8", supplier: "Bolt Depot", price: "0.129" },
    };
    const res = await app.inject({ method: "POST", url: "/parts", payload });
    expect(res.statusCode).toBe(201);
    expect(res.json()).toMatchObject({
      code: "A01-001-003",
      partTypeId: "purchased",
      source: "app",
      attributes: { sku: "BOLT-M3-8", price: 0.13 },
    });

    const again = await app.inject({ method: "POST", url: "/parts", payload });
    expect(again.statusCode).toBe(409);
  });

  it("exports attributes as columns", async () => {
    const res = await app.inject("/parts/export.csv");
    const [header, first] = res.body.split("\n");
    expect(header).toContain("partTypeId");
    expect(header).toContain("file_path");
    expect(first).toContain("grouser.stl");
  });

  it("serves the STL file", async () => {
    const res = await app.inject("/parts/A01-001-001/stl");
    expect(res.statusCode).toBe(200);
    expect(res.body).toBe("solid test");
  });

  it("refuses file paths outside Model Files", async () => {
    const res = await app.inject("/parts/A01-001-002/stl");
    expect(res.statusCode).toBe(400);
  });

  it("opens the model file in the slicer", async () => {
    const res = await app.inject({ method: "POST", url: "/parts/A01-001-001/open-in-slicer" });
    expect(res.statusCode).toBe(204);
    expect(opened).toHaveLength(1);
    expect(opened[0]).toMatch(/grouser\.stl$/);
  });

  it("won't open file paths outside Model Files in the slicer", async () => {
    const res = await app.inject({ method: "POST", url: "/parts/A01-001-002/open-in-slicer" });
    expect(res.statusCode).toBe(400);
    expect(opened).toHaveLength(0);
  });
});
