import type { FastifyPluginAsyncZod } from "fastify-type-provider-zod";
import { groupingIdParamsSchema, groupingUpdateSchema } from "@snowcat/shared";
import type { PartsRepository } from "@snowcat/db";

export const groupingsRoutes: FastifyPluginAsyncZod<{
  repo: PartsRepository;
}> = async (app, { repo }) => {
  app.get("/groupings", async () => repo.listGroupings());

  app.patch(
    "/groupings/:id",
    { schema: { params: groupingIdParamsSchema, body: groupingUpdateSchema } },
    async (request, reply) =>
      repo.updateGrouping(request.params.id, request.body) ??
      reply.notFound("Grouping not found"),
  );
};
