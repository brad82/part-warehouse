import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { openDb } from "@snowcat/db";
import { buildServer } from "../app.js";

let app: Awaited<ReturnType<typeof buildServer>>;

beforeEach(async () => {
  app = await buildServer({ db: openDb(":memory:"), logger: false });
});

afterEach(() => app.close());

const template = {
  name: "Shelf tag",
  widthMm: 50,
  heightMm: 20,
  elements: [
    {
      type: "barcode",
      symbology: "code128",
      field: "code",
      x: 2,
      y: 2,
      width: 46,
      height: 10,
      showText: true,
    },
  ],
};

describe("label templates routes", () => {
  it("ships the built-in templates from apps/api/templates", async () => {
    const list = (await app.inject("/label-templates")).json();
    expect(
      list.map((t: { id: string; builtin: boolean }) => [t.id, t.builtin]),
    ).toEqual([
      ["bag", true],
      ["small", true],
    ]);
    const small = (await app.inject("/label-templates/small")).json();
    expect(small).toMatchObject({
      name: "Small label",
      widthMm: 66.675,
      heightMm: 25.4,
    });
    expect(small.elements).toHaveLength(5);
  });

  it("creates, reads, replaces and deletes a template", async () => {
    const created = await app.inject({
      method: "POST",
      url: "/label-templates",
      payload: template,
    });
    expect(created.statusCode).toBe(201);
    expect(created.json()).toMatchObject({
      id: "shelf-tag",
      builtin: false,
      description: null,
      elements: template.elements,
    });

    const dup = await app.inject({
      method: "POST",
      url: "/label-templates",
      payload: template,
    });
    expect(dup.statusCode).toBe(409);

    const replaced = await app.inject({
      method: "PUT",
      url: "/label-templates/shelf-tag",
      payload: { ...template, name: "Shelf tag (wide)", widthMm: 70 },
    });
    expect(replaced.json()).toMatchObject({
      id: "shelf-tag",
      name: "Shelf tag (wide)",
      widthMm: 70,
    });

    const del = await app.inject({
      method: "DELETE",
      url: "/label-templates/shelf-tag",
    });
    expect(del.statusCode).toBe(204);
    expect((await app.inject("/label-templates/shelf-tag")).statusCode).toBe(
      404,
    );
  });

  it("rejects invalid elements", async () => {
    const bad = await app.inject({
      method: "POST",
      url: "/label-templates",
      payload: {
        ...template,
        elements: [{ type: "barcode", symbology: "nope" }],
      },
    });
    expect(bad.statusCode).toBe(400);
  });

  it("lets built-ins be edited but not deleted, and keeps edits on restart", async () => {
    const small = (await app.inject("/label-templates/small")).json();
    const edited = await app.inject({
      method: "PUT",
      url: "/label-templates/small",
      payload: { ...small, description: "Edited" },
    });
    expect(edited.json()).toMatchObject({
      builtin: true,
      description: "Edited",
    });

    const del = await app.inject({
      method: "DELETE",
      url: "/label-templates/small",
    });
    expect(del.statusCode).toBe(409);
  });
});
