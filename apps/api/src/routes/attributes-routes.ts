import type { FastifyPluginAsyncZod } from "fastify-type-provider-zod";
import {
  attributeDefCreateSchema,
  attributeDefUpdateSchema,
  attributeIdParamsSchema,
  partTypeCreateSchema,
  partTypeIdParamsSchema,
  partTypeUpdateSchema,
} from "@snowcat/shared";
import type { AttributesRepository } from "@snowcat/db";

/** Part types and attribute definitions, edited on the Settings page. */
export const attributesRoutes: FastifyPluginAsyncZod<{
  attributes: AttributesRepository;
}> = async (app, { attributes }) => {
  app.get("/part-types", async () => attributes.listPartTypes());

  app.post(
    "/part-types",
    { schema: { body: partTypeCreateSchema } },
    async (request, reply) =>
      reply.code(201).send(attributes.createPartType(request.body)),
  );

  app.patch(
    "/part-types/:id",
    { schema: { params: partTypeIdParamsSchema, body: partTypeUpdateSchema } },
    async (request, reply) =>
      attributes.updatePartType(request.params.id, request.body) ??
      reply.notFound("Part type not found"),
  );

  app.delete(
    "/part-types/:id",
    { schema: { params: partTypeIdParamsSchema } },
    async (request, reply) =>
      attributes.deletePartType(request.params.id)
        ? reply.code(204).send()
        : reply.notFound("Part type not found"),
  );

  app.get("/attributes", async () => attributes.listAttributeDefs());

  app.post(
    "/attributes",
    { schema: { body: attributeDefCreateSchema } },
    async (request, reply) =>
      reply.code(201).send(attributes.createAttributeDef(request.body)),
  );

  app.patch(
    "/attributes/:id",
    { schema: { params: attributeIdParamsSchema, body: attributeDefUpdateSchema } },
    async (request, reply) =>
      attributes.updateAttributeDef(request.params.id, request.body) ??
      reply.notFound("Attribute not found"),
  );

  app.delete(
    "/attributes/:id",
    { schema: { params: attributeIdParamsSchema } },
    async (request, reply) =>
      attributes.deleteAttributeDef(request.params.id)
        ? reply.code(204).send()
        : reply.notFound("Attribute not found"),
  );
};
