import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { groupingsRepository, openDb, partsRepository } from "@parts-warehouse/db";
import { buildServer } from "../app.js";

let app: Awaited<ReturnType<typeof buildServer>>;

beforeEach(async () => {
  const db = openDb(":memory:");
  const repo = partsRepository(db);
  const groupings = groupingsRepository(db);
  groupings.upsertGrouping({
    id: "A",
    taxonomy: "module",
    name: "Chassis",
    revision: 0,
    parentId: null,
  });
  groupings.upsertGrouping({
    id: "A01",
    taxonomy: "subassembly",
    name: "Tracks",
    revision: 0,
    parentId: "A",
  });
  groupings.upsertGrouping({
    id: "A01-001",
    taxonomy: "group",
    name: "Grousers",
    revision: 0,
    parentId: "A01",
  });
  repo.upsertCatalogPart({
    code: "A01-001-001",
    groupId: "A01-001",
    part: "01",
    revision: 0,
    name: "Grouser",
    qtyPerBuild: 1,
    notes: null,
    source: "csv",
    attributes: {},
  });
  app = await buildServer({ db, logger: false });
});

afterEach(() => app.close());

const create = (payload: object) =>
  app.inject({ method: "POST", url: "/groupings", payload });

describe("groupings routes", () => {
  it("creates each level under its parent", async () => {
    const mod = await create({
      id: "B",
      taxonomy: "module",
      name: "Cab",
      parentId: null,
    });
    expect(mod.statusCode).toBe(201);
    expect(
      (
        await create({
          id: "B01",
          taxonomy: "subassembly",
          name: "Frame",
          parentId: "B",
        })
      ).statusCode,
    ).toBe(201);
    const group = await create({
      id: "B01-001",
      taxonomy: "group",
      name: "Panels",
      parentId: "B01",
    });
    expect(group.json()).toEqual({
      id: "B01-001",
      taxonomy: "group",
      name: "Panels",
      revision: 0,
      parentId: "B01",
    });
  });

  it("refuses duplicates, bad codes and wrong parents", async () => {
    expect(
      (
        await create({
          id: "A01",
          taxonomy: "subassembly",
          name: "Again",
          parentId: "A",
        })
      ).statusCode,
    ).toBe(409);
    expect(
      (
        await create({
          id: "A1",
          taxonomy: "subassembly",
          name: "Bad",
          parentId: "A",
        })
      ).statusCode,
    ).toBe(400);
    expect(
      (
        await create({
          id: "B02",
          taxonomy: "subassembly",
          name: "Elsewhere",
          parentId: "A",
        })
      ).statusCode,
    ).toBe(400);
    expect(
      (
        await create({
          id: "C01",
          taxonomy: "subassembly",
          name: "No module",
          parentId: "C",
        })
      ).statusCode,
    ).toBe(400);
    expect(
      (
        await create({
          id: "A01-002",
          taxonomy: "group",
          name: "Under module",
          parentId: "A",
        })
      ).statusCode,
    ).toBe(400);
  });

  it("renames a grouping", async () => {
    const res = await app.inject({
      method: "PATCH",
      url: "/groupings/A01",
      payload: { name: "Track system" },
    });
    expect(res.json()).toMatchObject({ id: "A01", name: "Track system" });
  });

  it("deletes only empty groupings", async () => {
    expect(
      (await app.inject({ method: "DELETE", url: "/groupings/A01-001" }))
        .statusCode,
    ).toBe(409);
    expect(
      (await app.inject({ method: "DELETE", url: "/groupings/A01" }))
        .statusCode,
    ).toBe(409);
    await create({
      id: "A01-002",
      taxonomy: "group",
      name: "Spare",
      parentId: "A01",
    });
    expect(
      (await app.inject({ method: "DELETE", url: "/groupings/A01-002" }))
        .statusCode,
    ).toBe(204);
    expect(
      (await app.inject({ method: "DELETE", url: "/groupings/A01-002" }))
        .statusCode,
    ).toBe(404);
  });
});
