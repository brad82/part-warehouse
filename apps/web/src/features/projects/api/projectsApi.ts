import type { ProjectCreate, ProjectList } from "@parts-warehouse/shared";
import { baseApi } from "@shared/api/baseApi";

// Switching changes every other answer, so callers reset the whole cache
// (baseApi.util.resetApiState) rather than invalidating tags.
export const projectsApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    listProjects: build.query<ProjectList, void>({
      query: () => "/projects",
      providesTags: ["Project"],
    }),
    createProject: build.mutation<ProjectList, ProjectCreate>({
      query: (body) => ({ url: "/projects", method: "POST", body }),
    }),
    switchProject: build.mutation<ProjectList, string>({
      query: (slug) => ({ url: "/projects/active", method: "PUT", body: { slug } }),
    }),
  }),
});

export const {
  useListProjectsQuery,
  useCreateProjectMutation,
  useSwitchProjectMutation,
} = projectsApi;
