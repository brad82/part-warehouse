import { fileURLToPath } from "node:url";
import path from "node:path";

const appRoot = fileURLToPath(new URL("../../..", import.meta.url));
const dataDir = process.env.DATA_DIR ?? path.join(appRoot, "data");

export const config = {
  port: Number(process.env.PORT ?? 4000),
  host: process.env.HOST ?? "127.0.0.1",
  /**
   * app.json plus one folder per project: `<slug>/parts.db`, `part-images/`
   * and `models/` (the project's STL files).
   */
  dataDir,
  /**
   * host:port of the optional image-scraper app (gRPC). Unset: no scraping
   * from supplier links; uploads still work.
   */
  imageScraperUrl: process.env.IMAGE_SCRAPER_URL || null,
  slicerApp: process.env.SLICER_APP ?? "PrusaSlicer",
  /** Built-in label templates: one `<id>.json` each. */
  labelTemplatesDir:
    process.env.LABEL_TEMPLATES_DIR ??
    path.join(appRoot, "apps", "api", "templates"),
};
