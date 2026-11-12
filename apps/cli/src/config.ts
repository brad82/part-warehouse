import { existsSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const appRoot = fileURLToPath(new URL("../../..", import.meta.url));
const projectRoot = path.resolve(appRoot, "..");

/** Defaults for CLI flags; env vars match the API's. */
export const config = {
  /** app.json plus one `<slug>/` folder per project, as the API lays out. */
  dataDir: process.env.DATA_DIR ?? path.join(appRoot, "data"),
  partsIndexCsv:
    process.env.PARTS_INDEX_CSV ?? path.join(projectRoot, "Parts Index.csv"),
  /** Built-in label templates, shared with the API. */
  labelTemplatesDir:
    process.env.LABEL_TEMPLATES_DIR ??
    path.join(appRoot, "apps", "api", "templates"),
};

/** The project the API is serving, from app.json; null before its first start. */
function activeProject(dataDir: string): string | null {
  const file = path.join(dataDir, "app.json");
  if (!existsSync(file)) return null;
  return (JSON.parse(readFileSync(file, "utf8")) as { activeProject?: string })
    .activeProject ?? null;
}

/**
 * The SQLite file to use: --db as given, else --project's db, else the
 * active project's.
 */
export function resolveDbPath({ db, project }: { db?: string; project?: string }) {
  if (db) return db;
  const slug = project ?? activeProject(config.dataDir);
  if (!slug) {
    throw new Error(`No active project in ${config.dataDir}: start the API once, or pass --project/--db`);
  }
  const file = path.join(config.dataDir, slug, "parts.db");
  if (project && !existsSync(file)) throw new Error(`No project "${project}" in ${config.dataDir}`);
  return file;
}
