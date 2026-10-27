import type {
  Grouping,
  GroupingCreate,
  GroupingUpdate,
} from "@parts-warehouse/shared";
import { baseApi } from "@shared/api/baseApi";

/** Edits to the BOM structure. The list itself is catalogApi's listGroupings. */
export const bomStructureApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    createGrouping: build.mutation<Grouping, GroupingCreate>({
      query: (body) => ({ url: "/groupings", method: "POST", body }),
      invalidatesTags: ["Grouping"],
    }),
    updateGrouping: build.mutation<
      Grouping,
      { id: string; update: GroupingUpdate }
    >({
      query: ({ id, update }) => ({
        url: `/groupings/${id}`,
        method: "PATCH",
        body: update,
      }),
      invalidatesTags: ["Grouping"],
    }),
    deleteGrouping: build.mutation<void, string>({
      query: (id) => ({ url: `/groupings/${id}`, method: "DELETE" }),
      invalidatesTags: ["Grouping"],
    }),
  }),
});

export const {
  useCreateGroupingMutation,
  useUpdateGroupingMutation,
  useDeleteGroupingMutation,
} = bomStructureApi;
