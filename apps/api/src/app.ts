import cors from "@fastify/cors";
import sensible from "@fastify/sensible";
import {
  attributesRepository,
  partsRepository,
  previewColoursRepository,
} from "@snowcat/db";
import type Database from "better-sqlite3";
import Fastify from "fastify";
import {
  serializerCompiler,
  validatorCompiler,
  type ZodTypeProvider,
} from "fastify-type-provider-zod";
import type { OpenInSlicer } from "./lib/slicer.js";
import { attributesRoutes } from "./routes/attributes-routes.js";
import { groupingsRoutes } from "./routes/groupings-routes.js";
import { partsRoutes } from "./routes/parts-routes.js";
import { previewColoursRoutes } from "./routes/preview-colours-routes.js";

type Options = {
  db: Database.Database;
  modelFilesDir?: string;
  openInSlicer?: OpenInSlicer;
  logger?: boolean;
};

export async function buildServer({ db, modelFilesDir, openInSlicer, logger = true }: Options) {
  const app = Fastify({ logger }).withTypeProvider<ZodTypeProvider>();
  app.setValidatorCompiler(validatorCompiler);
  app.setSerializerCompiler(serializerCompiler);
  await app.register(sensible);
  await app.register(cors);

  const repo = partsRepository(db);
  const attributes = attributesRepository(db);
  app.get("/health", async () => ({ ok: true }));
  await app.register(partsRoutes, { repo, attributes, modelFilesDir, openInSlicer });
  await app.register(attributesRoutes, { attributes });
  await app.register(groupingsRoutes, { repo });
  await app.register(previewColoursRoutes, { colours: previewColoursRepository(db) });
  return app;
}
