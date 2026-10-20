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
  /** Part preview images (uploaded or scraped), managed by the API. */
  partImagesDir:
    process.env.PART_IMAGES_DIR ?? path.join(appRoot, "data", "part-images"),
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
