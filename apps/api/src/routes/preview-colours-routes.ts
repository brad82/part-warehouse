import type { FastifyPluginAsyncZod } from "fastify-type-provider-zod";
import {
  previewColourCreateSchema,
  previewColourIdParamsSchema,
  previewColourUpdateSchema,
} from "@snowcat/shared";
import type { PreviewColoursRepository } from "@snowcat/db";

/** STL viewer colours, edited on Settings → STL Preview. */
export const previewColoursRoutes: FastifyPluginAsyncZod<{
  colours: PreviewColoursRepository;
}> = async (app, { colours }) => {
  app.get("/preview-colours", async () => colours.list());

  app.post(
    "/preview-colours",
    { schema: { body: previewColourCreateSchema } },
    async (request, reply) => reply.code(201).send(colours.create(request.body)),
  );

  app.patch(
    "/preview-colours/:id",
    { schema: { params: previewColourIdParamsSchema, body: previewColourUpdateSchema } },
    async (request, reply) =>
      colours.update(request.params.id, request.body) ?? reply.notFound("Colour not found"),
  );

  app.delete(
    "/preview-colours/:id",
    { schema: { params: previewColourIdParamsSchema } },
    async (request, reply) =>
      colours.delete(request.params.id)
        ? reply.code(204).send()
        : reply.notFound("Colour not found"),
  );
};
