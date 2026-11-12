import { mkdtempSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { buildServer } from "../app.js";
import { appSettings } from "../projects/appSettings.js";
import { projectStore } from "../projects/projectStore.js";

let app: Awaited<ReturnType<typeof buildServer>>;
let projects: ReturnType<typeof projectStore>;
let settings: ReturnType<typeof appSettings>;

beforeEach(async () => {
  const dataDir = mkdtempSync(path.join(os.tmpdir(), "projects-routes-"));
  settings = appSettings(dataDir);
  projects = projectStore(dataDir, settings);
  app = await buildServer({ projects, settings, logger: false });
});

afterEach(async () => {
  await app.close();
  projects.close();
});

const grouping = { id: "A", taxonomy: "module", name: "Chassis", revision: 0, parentId: null };

describe("projects routes", () => {
  it("lists projects and the active one", async () => {
    expect((await app.inject("/projects")).json()).toEqual({
      active: "default",
      projects: [{ slug: "default", name: "Default" }],
    });
  });

  it("serves each project's own data", async () => {
    await app.inject({ method: "POST", url: "/groupings", payload: grouping });
    expect((await app.inject("/groupings")).json()).toHaveLength(1);

    const created = await app.inject({ method: "POST", url: "/projects", payload: { name: "Second" } });
    expect(created.statusCode).toBe(201);
    expect(created.json()).toMatchObject({ active: "second" });
    expect((await app.inject("/groupings")).json()).toEqual([]);
    // Built-in templates are seeded into the new db too.
    expect((await app.inject("/label-templates")).json().length).toBeGreaterThan(0);

    await app.inject({ method: "PUT", url: "/projects/active", payload: { slug: "default" } });
    expect((await app.inject("/groupings")).json()).toHaveLength(1);
  });

  it("keeps the label printer across projects", async () => {
    // No CUPS in tests, so set it directly rather than through the route.
    settings.setLabelPrinter("DYMO");
    await app.inject({ method: "POST", url: "/projects", payload: { name: "Second" } });
    expect((await app.inject("/capabilities")).json()).toMatchObject({ labelPrinter: "DYMO" });
  });

  it("404s an unknown project", async () => {
    const res = await app.inject({ method: "PUT", url: "/projects/active", payload: { slug: "nope" } });
    expect(res.statusCode).toBe(404);
    expect((await app.inject("/projects")).json()).toMatchObject({ active: "default" });
  });
});
