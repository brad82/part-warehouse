import { createReadStream, existsSync } from "node:fs";
import path from "node:path";
import type { FastifyPluginAsyncZod } from "fastify-type-provider-zod";
import {
  ATTR,
  attrText,
  groupingIdParamsSchema,
  partCodeParamsSchema,
  partCreateSchema,
  partListQuerySchema,
  partUpdateSchema,
} from "@snowcat/shared";
import type { AttributesRepository, PartsRepository } from "@snowcat/db";
import { config } from "../config.js";
import { toCsv } from "../lib/csv.js";
import { slicerLauncher, type OpenInSlicer } from "../lib/slicer.js";

type Options = {
  repo: PartsRepository;
  attributes: AttributesRepository;
  modelFilesDir?: string;
  openInSlicer?: OpenInSlicer;
};

/**
 * Resolves a part's file_path inside Model Files. Returns null for any path
 * that escapes the folder (`../`, absolute paths), so a bad DB value can
 * never serve an arbitrary file.
 */
export function resolveModelFile(root: string, filePath: string) {
  const base = path.resolve(root);
  const full = path.resolve(base, filePath);
  return full.startsWith(base + path.sep) ? full : null;
}

export const partsRoutes: FastifyPluginAsyncZod<Options> = async (
  app,
  {
    repo,
    attributes,
    modelFilesDir = config.modelFilesDir,
    openInSlicer = slicerLauncher(config.slicerApp),
  },
) => {
  /** The part's model file on disk; throws a 4xx if there isn't a usable one. */
  function modelFile(code: string) {
    const { httpErrors } = app;
    const part = repo.getPart(code);
    if (!part) throw httpErrors.notFound("Part not found");
    const filePath = attrText(part, ATTR.filePath);
    if (!filePath) throw httpErrors.notFound("Part has no STL file");
    const file = resolveModelFile(modelFilesDir, filePath);
    if (!file) throw httpErrors.badRequest("Invalid file path");
    if (!existsSync(file)) throw httpErrors.notFound("STL file not found");
    return file;
  }

  app.get(
    "/parts",
    { schema: { querystring: partListQuerySchema } },
    async (request) => repo.listParts(request.query.q || undefined),
  );

  app.post(
    "/parts",
    { schema: { body: partCreateSchema } },
    async (request, reply) => reply.code(201).send(repo.createPart(request.body)),
  );

  app.get(
    "/groupings/:id/next-part",
    { schema: { params: groupingIdParamsSchema } },
    async (request) => ({ part: repo.nextPartNumber(request.params.id) }),
  );

  // One column per core field, then one per attribute definition.
  app.get("/parts/export.csv", async (_request, reply) => {
    const parts = repo.listParts();
    const defs = attributes.listAttributeDefs();
    const core = [
      "code", "groupId", "part", "revision", "name", "partTypeId",
      "qtyPerBuild", "onHand", "status", "notes", "source", "updatedAt",
    ] as const;
    reply
      .header("content-type", "text/csv; charset=utf-8")
      .header("content-disposition", 'attachment; filename="parts.csv"');
    return toCsv([
      [...core, ...defs.map((d) => d.key)],
      ...parts.map((p) => [
        ...core.map((k) => p[k]),
        ...defs.map((d) => p.attributes[d.key] ?? null),
      ]),
    ]);
  });

  app.get(
    "/parts/:code",
    { schema: { params: partCodeParamsSchema } },
    async (request, reply) =>
      repo.getPart(request.params.code) ?? reply.notFound("Part not found"),
  );

  app.patch(
    "/parts/:code",
    { schema: { params: partCodeParamsSchema, body: partUpdateSchema } },
    async (request, reply) =>
      repo.updatePart(request.params.code, request.body) ??
      reply.notFound("Part not found"),
  );

  app.get(
    "/parts/:code/stl",
    { schema: { params: partCodeParamsSchema } },
    async (request, reply) => {
      const file = modelFile(request.params.code);
      reply.header("content-type", "model/stl");
      return reply.send(createReadStream(file));
    },
  );

  app.post(
    "/parts/:code/open-in-slicer",
    { schema: { params: partCodeParamsSchema } },
    async (request, reply) => {
      const file = modelFile(request.params.code);
      try {
        await openInSlicer(file);
      } catch (err) {
        request.log.error(err, "Failed to launch slicer");
        throw app.httpErrors.internalServerError(
          `Couldn't open PrusaSlicer (SLICER_APP=${config.slicerApp})`,
        );
      }
      return reply.code(204).send();
    },
  );
};
