import { openDb } from "@parts-warehouse/db";
import type { Project } from "@parts-warehouse/shared";
import type Database from "better-sqlite3";
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import type { AppSettings } from "./appSettings.js";

/** The project the API is serving: its db and folders. */
export type ActiveProject = Project & {
  db: Database.Database;
  partImagesDir: string;
  modelFilesDir: string;
};

export type ProjectStore = {
  current(): ActiveProject;
  list(): Project[];
  /** Makes an empty project; doesn't activate it. */
  create(name: string): Project;
  /** Serves `slug` from now on. A failure leaves the old project active. */
  activate(slug: string): ActiveProject;
  close(): void;
};

export class UnknownProjectError extends Error {
  constructor(slug: string) {
    super(`No project "${slug}"`);
  }
}

/** Folder-safe slug: "4x3D Snowcat" → "4x3d-snowcat". */
export function slugify(name: string) {
  return (
    name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") || "project"
  );
}

/** Project folder layout. */
export const projectPaths = (dataDir: string, slug: string) => {
  const dir = path.join(dataDir, slug);
  return {
    dir,
    meta: path.join(dir, "project.json"),
    db: path.join(dir, "parts.db"),
    partImagesDir: path.join(dir, "part-images"),
    modelFilesDir: path.join(dir, "models"),
  };
};

/** Projects in `dataDir`, by name. */
export function listProjects(dataDir: string): Project[] {
  if (!existsSync(dataDir)) return [];
  return readdirSync(dataDir, { withFileTypes: true })
    .filter((e) => e.isDirectory() && existsSync(projectPaths(dataDir, e.name).meta))
    .map((e) => {
      const meta = JSON.parse(readFileSync(projectPaths(dataDir, e.name).meta, "utf8")) as {
        name?: string;
      };
      return { slug: e.name, name: meta.name ?? e.name };
    })
    .sort((a, b) => a.name.localeCompare(b.name));
}

/**
 * Projects in `dataDir`: each is a `<slug>/` folder with a `project.json`.
 * One is open at a time; switching closes the old db.
 */
export function projectStore(dataDir: string, settings: AppSettings): ProjectStore {
  const list = () => listProjects(dataDir);

  function create(name: string): Project {
    const base = slugify(name);
    let slug = base;
    for (let n = 2; existsSync(path.join(dataDir, slug)); n++) slug = `${base}-${n}`;
    const paths = projectPaths(dataDir, slug);
    mkdirSync(paths.modelFilesDir, { recursive: true });
    writeFileSync(paths.meta, JSON.stringify({ name }, null, 2));
    openDb(paths.db).close(); // creates and seeds it
    return { slug, name };
  }

  function open(slug: string): ActiveProject {
    const project = list().find((p) => p.slug === slug);
    if (!project) throw new UnknownProjectError(slug);
    const paths = projectPaths(dataDir, slug);
    return {
      ...project,
      db: openDb(paths.db),
      partImagesDir: paths.partImagesDir,
      modelFilesDir: paths.modelFilesDir,
    };
  }

  // Start on the saved project, else the first one, else a new empty one.
  const projects = list();
  const saved = settings.activeProject();
  const initial = projects.some((p) => p.slug === saved)
    ? saved!
    : (projects[0] ?? create("Default")).slug;
  let current = open(initial);
  settings.setActiveProject(initial);

  return {
    current: () => current,
    list,
    create,
    activate(slug) {
      if (slug === current.slug) return current;
      const next = open(slug);
      current.db.close();
      current = next;
      settings.setActiveProject(slug);
      return current;
    },
    close: () => current.db.close(),
  };
}

/** A store that only ever serves one db; for tests and single-db setups. */
export function fixedProject(
  db: Database.Database,
  dirs: { partImagesDir: string; modelFilesDir: string },
): ProjectStore {
  const project: ActiveProject = { slug: "default", name: "Default", db, ...dirs };
  return {
    current: () => project,
    list: () => [{ slug: project.slug, name: project.name }],
    create: () => {
      throw new Error("This server serves a single project");
    },
    activate(slug) {
      if (slug !== project.slug) throw new UnknownProjectError(slug);
      return project;
    },
    close: () => {},
  };
}
