import type {
  AttributeDef,
  AttributeDefCreate,
  AttributeDefUpdate,
  Grouping,
  GroupingCreate,
  GroupingUpdate,
  PartType,
  PartTypeCreate,
  PartTypeUpdate,
  PreviewColour,
  PreviewColourCreate,
  PreviewColourUpdate,
} from "@parts-warehouse/shared";
import { baseApi } from "@shared/api/baseApi";

// Lists come from partsApi (listPartTypes, listAttributeDefs). Changing a
// definition can change parts (deleted values), so parts refetch too.
export const settingsApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    createPartType: build.mutation<PartType, PartTypeCreate>({
      query: (body) => ({ url: "/part-types", method: "POST", body }),
      invalidatesTags: ["PartType"],
    }),
    updatePartType: build.mutation<PartType, { id: string; update: PartTypeUpdate }>({
      query: ({ id, update }) => ({ url: `/part-types/${id}`, method: "PATCH", body: update }),
      invalidatesTags: ["PartType"],
    }),
    deletePartType: build.mutation<void, string>({
      query: (id) => ({ url: `/part-types/${id}`, method: "DELETE" }),
      invalidatesTags: ["PartType", "AttributeDef"],
    }),
    createAttributeDef: build.mutation<AttributeDef, AttributeDefCreate>({
      query: (body) => ({ url: "/attributes", method: "POST", body }),
      invalidatesTags: ["AttributeDef"],
    }),
    updateAttributeDef: build.mutation<AttributeDef, { id: number; update: AttributeDefUpdate }>({
      query: ({ id, update }) => ({ url: `/attributes/${id}`, method: "PATCH", body: update }),
      invalidatesTags: ["AttributeDef", "Part"],
    }),
    deleteAttributeDef: build.mutation<void, number>({
      query: (id) => ({ url: `/attributes/${id}`, method: "DELETE" }),
      invalidatesTags: ["AttributeDef", "Part"],
    }),
    createPreviewColour: build.mutation<PreviewColour, PreviewColourCreate>({
      query: (body) => ({ url: "/preview-colours", method: "POST", body }),
      invalidatesTags: ["PreviewColour"],
    }),
    updatePreviewColour: build.mutation<PreviewColour, { id: number; update: PreviewColourUpdate }>({
      query: ({ id, update }) => ({ url: `/preview-colours/${id}`, method: "PATCH", body: update }),
      invalidatesTags: ["PreviewColour"],
    }),
    deletePreviewColour: build.mutation<void, number>({
      query: (id) => ({ url: `/preview-colours/${id}`, method: "DELETE" }),
      invalidatesTags: ["PreviewColour"],
    }),
    createGrouping: build.mutation<Grouping, GroupingCreate>({
      query: (body) => ({ url: "/groupings", method: "POST", body }),
      invalidatesTags: ["Grouping"],
    }),
    updateGrouping: build.mutation<Grouping, { id: string; update: GroupingUpdate }>({
      query: ({ id, update }) => ({ url: `/groupings/${id}`, method: "PATCH", body: update }),
      invalidatesTags: ["Grouping"],
    }),
    deleteGrouping: build.mutation<void, string>({
      query: (id) => ({ url: `/groupings/${id}`, method: "DELETE" }),
      invalidatesTags: ["Grouping"],
    }),
  }),
});

export const {
  useCreatePartTypeMutation,
  useUpdatePartTypeMutation,
  useDeletePartTypeMutation,
  useCreateAttributeDefMutation,
  useUpdateAttributeDefMutation,
  useDeleteAttributeDefMutation,
  useCreatePreviewColourMutation,
  useUpdatePreviewColourMutation,
  useDeletePreviewColourMutation,
  useCreateGroupingMutation,
  useUpdateGroupingMutation,
  useDeleteGroupingMutation,
} = settingsApi;
