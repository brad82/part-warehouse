import type { FastifyPluginAsyncZod } from "fastify-type-provider-zod";
import {
  labelTemplateIdParamsSchema,
  labelTemplateInputSchema,
} from "@snowcat/shared";
import type { LabelTemplatesRepository } from "@snowcat/db";

/** Label templates: made in the label editor, printed by web and CLI. */
export const labelTemplatesRoutes: FastifyPluginAsyncZod<{
  templates: LabelTemplatesRepository;
}> = async (app, { templates }) => {
  app.get("/label-templates", async () => templates.list());

  app.get(
    "/label-templates/:id",
    { schema: { params: labelTemplateIdParamsSchema } },
    async (request, reply) =>
      templates.get(request.params.id) ?? reply.notFound("Template not found"),
  );

  app.post(
    "/label-templates",
    { schema: { body: labelTemplateInputSchema } },
    async (request, reply) =>
      reply.code(201).send(templates.create(request.body)),
  );

  app.put(
    "/label-templates/:id",
    {
      schema: {
        params: labelTemplateIdParamsSchema,
        body: labelTemplateInputSchema,
      },
    },
    async (request, reply) =>
      templates.update(request.params.id, request.body) ??
      reply.notFound("Template not found"),
  );

  app.delete(
    "/label-templates/:id",
    { schema: { params: labelTemplateIdParamsSchema } },
    async (request, reply) =>
      templates.delete(request.params.id)
        ? reply.code(204).send()
        : reply.notFound("Template not found"),
  );
};
