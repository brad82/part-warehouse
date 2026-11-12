import cors from "@fastify/cors";
import sensible from "@fastify/sensible";
import {
  attributesRepository,
  groupingsRepository,
  labelTemplatesRepository,
  loadLabelTemplateFiles,
  partImagesRepository,
  partsRepository,
  previewColoursRepository,
  settingsRepository,
  type SettingsRepository,
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
import path from "node:path";
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
import { projectsRoutes } from "./routes/projects-routes.js";
import { live } from "./projects/live.js";
import { fixedProject, type ProjectStore } from "./projects/projectStore.js";

type Settings = Pick<SettingsRepository, "labelPrinter" | "setLabelPrinter">;

type Options = (
  | {
      /** The projects to serve, one at a time; adds the /projects routes. */
      projects: ProjectStore;
      /** Machine-wide settings (label printer), kept outside any project. */
      settings: Settings;
    }
  | {
      /** A single db, for tests: no project switching, settings in the db. */
      db: Database.Database;
      modelFilesDir?: string;
      partImagesDir?: string;
    }
) & {
  openInSlicer?: OpenInSlicer;
  /** The optional image-scraper app (a gRPC client); null turns scraping off. */
  scraper?: ImageScraper | null;
  logger?: boolean;
  /** Folder of built-in label templates, added to the db if missing. */
  labelTemplatesDir?: string;
  /** The machine's printers (default: CUPS); tests pass a fake. */
  printSystem?: PrintSystem;
};

function repositories(db: Database.Database, labelTemplatesDir: string) {
  const templates = labelTemplatesRepository(db);
  templates.ensureBuiltins(loadLabelTemplateFiles(labelTemplatesDir));
  return {
    parts: partsRepository(db),
    attributes: attributesRepository(db),
    images: partImagesRepository(db),
    groupings: groupingsRepository(db),
    colours: previewColoursRepository(db),
    templates,
  };
}

export async function buildServer(options: Options) {
  const {
    openInSlicer,
    scraper = null,
    logger = true,
    labelTemplatesDir = config.labelTemplatesDir,
    printSystem = cupsPrintSystem,
  } = options;
  const app = Fastify({ logger }).withTypeProvider<ZodTypeProvider>();
  app.setValidatorCompiler(validatorCompiler);
  app.setSerializerCompiler(serializerCompiler);
  await app.register(sensible);
  await app.register(cors);

  const projects =
    "projects" in options
      ? options.projects
      : fixedProject(options.db, {
          partImagesDir:
            options.partImagesDir ?? path.join(config.dataDir, "part-images"),
          modelFilesDir:
            options.modelFilesDir ?? path.join(config.dataDir, "models"),
        });
  const settings: Settings =
    "settings" in options ? options.settings : settingsRepository(options.db);

  // Repositories for the active project's db, built once per db. Routes get
  // live() stand-ins, so a project switch reaches them without re-registering.
  const built = new WeakMap<Database.Database, ReturnType<typeof repositories>>();
  const active = () => {
    const { db } = projects.current();
    let repos = built.get(db);
    if (!repos) built.set(db, (repos = repositories(db, labelTemplatesDir)));
    return repos;
  };
  active(); // seed the built-in templates now, not on the first request
  const repo = live(() => active().parts);
  const attributes = live(() => active().attributes);
  const templates = live(() => active().templates);

  app.get("/health", async () => ({ ok: true }));
  // Optional modules installed, so the web app can hide what's missing.
  app.get(
    "/capabilities",
    async (): Promise<Capabilities> => ({
      imageScraper: scraper != null,
      labelPrinter: settings.labelPrinter(),
    }),
  );
  if ("projects" in options) await app.register(projectsRoutes, { projects });
  await app.register(partsRoutes, {
    repo,
    attributes,
    modelFilesDir: () => projects.current().modelFilesDir,
    openInSlicer,
  });
  await app.register(partImagesRoutes, {
    repo,
    images: live(() => active().images),
    partImagesDir: () => projects.current().partImagesDir,
    scraper,
  });
  await app.register(attributesRoutes, { attributes });
  await app.register(groupingsRoutes, {
    groupings: live(() => active().groupings),
  });
  await app.register(previewColoursRoutes, {
    colours: live(() => active().colours),
  });
  await app.register(labelTemplatesRoutes, { templates });
  await app.register(labelsRoutes, { repo, templates, settings, printSystem });
  await app.register(printersRoutes, { settings, printSystem });
  return app;
}
