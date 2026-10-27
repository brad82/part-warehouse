import cors from "@fastify/cors";
import sensible from "@fastify/sensible";
import {
  attributesRepository,
  labelTemplatesRepository,
  loadLabelTemplateFiles,
  partImagesRepository,
  partsRepository,
  previewColoursRepository,
  settingsRepository,
} from "@parts-warehouse/db";
import type { Capabilities } from "@parts-warehouse/shared";
import type Database from "better-sqlite3";
import Fastify from "fastify";
import {
  serializerCompiler,
  validatorCompiler,
  type ZodTypeProvider,
} from "fastify-type-provider-zod";
import type { ImageScraper } from "@parts-warehouse/image-scraper-proto";
import { config } from "./config.js";
import { cupsPrintSystem, type PrintSystem } from "./lib/printers.js";
import type { OpenInSlicer } from "./lib/slicer.js";
import { attributesRoutes } from "./routes/attributes-routes.js";
import { groupingsRoutes } from "./routes/groupings-routes.js";
import { labelTemplatesRoutes } from "./routes/label-templates-routes.js";
import { labelsRoutes } from "./routes/labels-routes.js";
import { partImagesRoutes } from "./routes/part-images-routes.js";
import { partsRoutes } from "./routes/parts-routes.js";
import { previewColoursRoutes } from "./routes/preview-colours-routes.js";
import { printersRoutes } from "./routes/printers-routes.js";

type Options = {
  db: Database.Database;
  modelFilesDir?: string;
  openInSlicer?: OpenInSlicer;
  partImagesDir?: string;
  /** The optional image-scraper app (a gRPC client); null turns scraping off. */
  scraper?: ImageScraper | null;
  logger?: boolean;
  /** Folder of built-in label templates, added to the db if missing. */
  labelTemplatesDir?: string;
  /** The machine's printers (default: CUPS); tests pass a fake. */
  printSystem?: PrintSystem;
};

export async function buildServer({
  db,
  modelFilesDir,
  openInSlicer,
  partImagesDir,
  scraper = null,
  logger = true,
  labelTemplatesDir = config.labelTemplatesDir,
  printSystem = cupsPrintSystem,
}: Options) {
  const app = Fastify({ logger }).withTypeProvider<ZodTypeProvider>();
  app.setValidatorCompiler(validatorCompiler);
  app.setSerializerCompiler(serializerCompiler);
  await app.register(sensible);
  await app.register(cors);

  const repo = partsRepository(db);
  const settings = settingsRepository(db);
  const attributes = attributesRepository(db);
  app.get("/health", async () => ({ ok: true }));
  // Optional modules installed, so the web app can hide what's missing.
  app.get(
    "/capabilities",
    async (): Promise<Capabilities> => ({
      imageScraper: scraper != null,
      labelPrinter: settings.labelPrinter(),
    }),
  );
  await app.register(partsRoutes, {
    repo,
    attributes,
    modelFilesDir,
    openInSlicer,
  });
  await app.register(partImagesRoutes, {
    repo,
    images: partImagesRepository(db),
    partImagesDir,
    scraper,
  });
  await app.register(attributesRoutes, { attributes });
  await app.register(groupingsRoutes, { repo });
  await app.register(previewColoursRoutes, {
    colours: previewColoursRepository(db),
  });
  const templates = labelTemplatesRepository(db);
  templates.ensureBuiltins(loadLabelTemplateFiles(labelTemplatesDir));
  await app.register(labelTemplatesRoutes, { templates });
  await app.register(labelsRoutes, { repo, templates, settings, printSystem });
  await app.register(printersRoutes, { settings, printSystem });
  return app;
}
