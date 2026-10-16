import { fileURLToPath } from "node:url";
import path from "node:path";

const appRoot = fileURLToPath(new URL("../../..", import.meta.url));
const projectRoot = path.resolve(appRoot, "..");

export const config = {
  port: Number(process.env.PORT ?? 4000),
  host: process.env.HOST ?? "127.0.0.1",
  dbPath: process.env.DB_PATH ?? path.join(appRoot, "data", "parts.db"),
  modelFilesDir:
    process.env.MODEL_FILES_DIR ?? path.join(projectRoot, "Model Files"),
  slicerApp: process.env.SLICER_APP ?? "PrusaSlicer",
};
