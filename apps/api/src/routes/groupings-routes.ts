import type { FastifyPluginAsyncZod } from "fastify-type-provider-zod";
import {
  groupingCreateSchema,
  groupingIdParamsSchema,
  groupingUpdateSchema,
} from "@parts-warehouse/shared";
import type { GroupingsRepository } from "@parts-warehouse/db";

/** Modules, sub-assemblies and groups, edited on Settings → BOM structure. */
export const groupingsRoutes: FastifyPluginAsyncZod<{
  groupings: GroupingsRepository;
}> = async (app, { groupings }) => {
  app.get("/groupings", async () => groupings.listGroupings());

  app.post(
    "/groupings",
    { schema: { body: groupingCreateSchema } },
    async (request, reply) =>
      reply.code(201).send(groupings.createGrouping(request.body)),
  );

  app.patch(
    "/groupings/:id",
    { schema: { params: groupingIdParamsSchema, body: groupingUpdateSchema } },
    async (request, reply) =>
      groupings.updateGrouping(request.params.id, request.body) ??
      reply.notFound("Grouping not found"),
  );

  app.delete(
    "/groupings/:id",
    { schema: { params: groupingIdParamsSchema } },
    async (request, reply) =>
      groupings.deleteGrouping(request.params.id)
        ? reply.code(204).send()
        : reply.notFound("Grouping not found"),
  );
};
