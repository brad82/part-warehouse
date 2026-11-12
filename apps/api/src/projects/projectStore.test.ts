import { existsSync, mkdtempSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { beforeEach, describe, expect, it } from "vitest";
import { groupingsRepository } from "@parts-warehouse/db";
import { appSettings } from "./appSettings.js";
import { projectStore, slugify, UnknownProjectError } from "./projectStore.js";

let dataDir: string;
let settings: ReturnType<typeof appSettings>;

beforeEach(() => {
  dataDir = mkdtempSync(path.join(os.tmpdir(), "projects-"));
  settings = appSettings(dataDir);
});

describe("projectStore", () => {
  it("makes a Default project in an empty data folder", () => {
    const store = projectStore(dataDir, settings);
    expect(store.list()).toEqual([{ slug: "default", name: "Default" }]);
    expect(store.current().slug).toBe("default");
    expect(settings.activeProject()).toBe("default");
    store.close();
  });

  it("creates projects with unique slugs and folders", () => {
    const store = projectStore(dataDir, settings);
    expect(store.create("Mini Snowcat!")).toEqual({ slug: "mini-snowcat", name: "Mini Snowcat!" });
    expect(store.create("Mini Snowcat")).toEqual({ slug: "mini-snowcat-2", name: "Mini Snowcat" });
    expect(existsSync(path.join(dataDir, "mini-snowcat", "parts.db"))).toBe(true);
    expect(existsSync(path.join(dataDir, "mini-snowcat", "models"))).toBe(true);
    store.close();
  });

  it("switches db and folders, and remembers the choice", () => {
    const store = projectStore(dataDir, settings);
    const { slug } = store.create("Second");
    groupingsRepository(store.current().db).upsertGrouping({
      id: "A", taxonomy: "module", name: "Chassis", revision: 0, parentId: null,
    });
    const first = store.current();

    const second = store.activate(slug);
    expect(first.db.open).toBe(false);
    expect(second.partImagesDir).toBe(path.join(dataDir, slug, "part-images"));
    expect(groupingsRepository(second.db).listGroupings()).toEqual([]);
    store.close();

    const reopened = projectStore(dataDir, settings);
    expect(reopened.current().slug).toBe(slug);
    reopened.close();
  });

  it("keeps the current project when the slug is unknown", () => {
    const store = projectStore(dataDir, settings);
    expect(() => store.activate("../etc")).toThrow(UnknownProjectError);
    expect(store.current().db.open).toBe(true);
    expect(store.current().slug).toBe("default");
    store.close();
  });

  it("slugifies names", () => {
    expect(slugify("4x3D Snowcat")).toBe("4x3d-snowcat");
    expect(slugify("!!!")).toBe("project");
  });
});
