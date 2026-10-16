import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { openDb } from "@snowcat/db";
import { buildServer } from "../app.js";

let app: Awaited<ReturnType<typeof buildServer>>;

beforeEach(async () => {
  app = await buildServer({ db: openDb(":memory:"), logger: false });
});

afterEach(() => app.close());

describe("preview colours routes", () => {
  it("seeds the colours parts use", async () => {
    const names = (await app.inject("/preview-colours")).json().map((c: { name: string }) => c.name);
    expect(names).toEqual(["Black", "Dark Grey", "Light Grey", "Red", "Yellow"]);
  });

  it("creates, edits and deletes a colour", async () => {
    const created = await app.inject({
      method: "POST",
      url: "/preview-colours",
      payload: { name: "Orange", hex: "#E67E22" },
    });
    expect(created.statusCode).toBe(201);
    expect(created.json()).toMatchObject({ name: "Orange", hex: "#e67e22", sort: 60 });
    const { id } = created.json();

    const dup = await app.inject({
      method: "POST",
      url: "/preview-colours",
      payload: { name: "orange", hex: "#000000" },
    });
    expect(dup.statusCode).toBe(409);

    const bad = await app.inject({
      method: "PATCH",
      url: `/preview-colours/${id}`,
      payload: { hex: "orange" },
    });
    expect(bad.statusCode).toBe(400);

    const edited = await app.inject({
      method: "PATCH",
      url: `/preview-colours/${id}`,
      payload: { hex: "#ff8800" },
    });
    expect(edited.json()).toMatchObject({ name: "Orange", hex: "#ff8800" });

    expect((await app.inject({ method: "DELETE", url: `/preview-colours/${id}` })).statusCode).toBe(204);
    expect((await app.inject({ method: "DELETE", url: `/preview-colours/${id}` })).statusCode).toBe(404);
  });
});
