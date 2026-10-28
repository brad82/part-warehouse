import type {
  AttributeDef,
  AttributeDefCreate,
  AttributeDefUpdate,
  LabelPrinterSetting,
  PartType,
  PartTypeCreate,
  PartTypeUpdate,
  PreviewColour,
  PreviewColourCreate,
  PreviewColourUpdate,
  Printer,
} from "@parts-warehouse/shared";
import { baseApi } from "@shared/api/baseApi";

// Lists come from catalogApi (listPartTypes, listAttributeDefs). Changing a
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
    /** The API machine's printers; refetched each visit (status changes). */
    listPrinters: build.query<Printer[], void>({
      query: () => "/printers",
      keepUnusedDataFor: 0,
    }),
    getLabelPrinter: build.query<LabelPrinterSetting, void>({
      query: () => "/settings/label-printer",
      providesTags: ["LabelPrinter"],
    }),
    setLabelPrinter: build.mutation<LabelPrinterSetting, LabelPrinterSetting>({
      query: (body) => ({ url: "/settings/label-printer", method: "PUT", body }),
      // The label dialog reads the printer from /capabilities.
      invalidatesTags: ["LabelPrinter", "Capabilities"],
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
  useListPrintersQuery,
  useGetLabelPrinterQuery,
  useSetLabelPrinterMutation,
} = settingsApi;
