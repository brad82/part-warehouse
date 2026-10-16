import { fileURLToPath } from "node:url";
import path from "node:path";

const appRoot = fileURLToPath(new URL("../../..", import.meta.url));
const projectRoot = path.resolve(appRoot, "..");

/** Defaults for CLI flags; env vars match the API's. */
export const config = {
  dbPath: process.env.DB_PATH ?? path.join(appRoot, "data", "parts.db"),
  partsIndexCsv:
    process.env.PARTS_INDEX_CSV ?? path.join(projectRoot, "Parts Index.csv"),
};
