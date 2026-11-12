import type { FastifyPluginAsyncZod } from "fastify-type-provider-zod";
import {
  projectActivateSchema,
  projectCreateSchema,
  type ProjectList,
} from "@parts-warehouse/shared";
import { UnknownProjectError, type ProjectStore } from "../projects/projectStore.js";

/** The project switcher: list projects, make one, change which is served. */
export const projectsRoutes: FastifyPluginAsyncZod<{ projects: ProjectStore }> = async (
  app,
  { projects },
) => {
  const summary = (): ProjectList => ({
    active: projects.current().slug,
    projects: projects.list(),
  });

  app.get("/projects", async () => summary());

  // A new project is the one you want to work on, so it becomes active.
  app.post(
    "/projects",
    { schema: { body: projectCreateSchema } },
    async (request, reply) => {
      const { slug } = projects.create(request.body.name);
      projects.activate(slug);
      return reply.code(201).send(summary());
    },
  );

  app.put(
    "/projects/active",
    { schema: { body: projectActivateSchema } },
    async (request) => {
      try {
        projects.activate(request.body.slug);
      } catch (err) {
        if (err instanceof UnknownProjectError) throw app.httpErrors.notFound(err.message);
        throw err;
      }
      return summary();
    },
  );
};
