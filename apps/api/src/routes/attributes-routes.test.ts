import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { groupingsRepository, openDb, partsRepository } from "@parts-warehouse/db";
import { buildServer } from "../app.js";

let app: Awaited<ReturnType<typeof buildServer>>;

beforeEach(async () => {
  const db = openDb(":memory:");
  const repo = partsRepository(db);
  const groupings = groupingsRepository(db);
  groupings.upsertGrouping({ id: "A", taxonomy: "module", name: "Chassis", revision: 0, parentId: null });
  groupings.upsertGrouping({ id: "A01", taxonomy: "subassembly", name: "Tracks", revision: 0, parentId: "A" });
  groupings.upsertGrouping({ id: "A01-001", taxonomy: "group", name: "Grousers", revision: 0, parentId: "A01" });
  repo.upsertCatalogPart({
    code: "A01-001-001", groupId: "A01-001", part: "01", revision: 0, name: "Grouser",
    qtyPerBuild: 1, notes: null, source: "csv", attributes: { colour: "Black" },
  });
  app = await buildServer({ db, logger: false });
});

afterEach(() => app.close());

const byKey = async (key: string) =>
  (await app.inject("/attributes")).json().find((a: { key: string }) => a.key === key);

describe("attributes routes", () => {
  it("seeds printed and purchased types with their attributes", async () => {
    expect((await app.inject("/part-types")).json().map((t: { id: string }) => t.id)).toEqual([
      "printed",
      "purchased",
    ]);
    expect(await byKey("price")).toMatchObject({
      dataType: "currency",
      unit: "CAD",
      system: false,
      partTypeIds: ["purchased"],
    });
  });

  it("creates, edits and deletes an attribute", async () => {
    const created = await app.inject({
      method: "POST",
      url: "/attributes",
      payload: { key: "lead_time", label: "Lead time", dataType: "integer", unit: "days", partTypeIds: ["purchased"] },
    });
    expect(created.statusCode).toBe(201);
    const { id } = created.json();

    const dup = await app.inject({
      method: "POST",
      url: "/attributes",
      payload: { key: "lead_time", label: "Again", dataType: "text" },
    });
    expect(dup.statusCode).toBe(409);

    const edited = await app.inject({
      method: "PATCH",
      url: `/attributes/${id}`,
      payload: { label: "Lead time (days)", partTypeIds: ["printed", "purchased"] },
    });
    expect(edited.json()).toMatchObject({ label: "Lead time (days)", partTypeIds: ["printed", "purchased"] });

    expect((await app.inject({ method: "DELETE", url: `/attributes/${id}` })).statusCode).toBe(204);
    expect(await byKey("lead_time")).toBeUndefined();
  });

  it("protects system attributes", async () => {
    const { id } = await byKey("file_path");
    const retype = await app.inject({ method: "PATCH", url: `/attributes/${id}`, payload: { dataType: "url" } });
    expect(retype.statusCode).toBe(400);
    const relabel = await app.inject({ method: "PATCH", url: `/attributes/${id}`, payload: { label: "STL" } });
    expect(relabel.statusCode).toBe(200);
    expect((await app.inject({ method: "DELETE", url: `/attributes/${id}` })).statusCode).toBe(400);
  });

  it("refuses a type change that existing values don't fit", async () => {
    const { id } = await byKey("sku");
    await app.inject({
      method: "PATCH",
      url: "/parts/A01-001-001",
      payload: { attributes: { sku: "ABC" } },
    });
    const res = await app.inject({ method: "PATCH", url: `/attributes/${id}`, payload: { dataType: "integer" } });
    expect(res.statusCode).toBe(409);
  });

  it("requires options for a select", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/attributes",
      payload: { key: "finish", label: "Finish", dataType: "select" },
    });
    expect(res.statusCode).toBe(400);
  });

  it("refuses to delete a part type in use", async () => {
    expect((await app.inject({ method: "DELETE", url: "/part-types/printed" })).statusCode).toBe(409);
    await app.inject({ method: "POST", url: "/part-types", payload: { id: "kit", name: "Kit" } });
    expect((await app.inject({ method: "DELETE", url: "/part-types/kit" })).statusCode).toBe(204);
  });
});
