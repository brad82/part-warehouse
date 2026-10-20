import type { LabelTemplate, LabelTemplateInput } from "@parts-warehouse/shared";
import { baseApi } from "@shared/api/baseApi";

export const labelTemplatesApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    listLabelTemplates: build.query<LabelTemplate[], void>({
      query: () => "/label-templates",
      providesTags: ["LabelTemplate"],
    }),
    createLabelTemplate: build.mutation<LabelTemplate, LabelTemplateInput>({
      query: (body) => ({ url: "/label-templates", method: "POST", body }),
      invalidatesTags: ["LabelTemplate"],
    }),
    updateLabelTemplate: build.mutation<
      LabelTemplate,
      { id: string; template: LabelTemplateInput }
    >({
      query: ({ id, template }) => ({
        url: `/label-templates/${encodeURIComponent(id)}`,
        method: "PUT",
        body: template,
      }),
      invalidatesTags: ["LabelTemplate"],
    }),
    deleteLabelTemplate: build.mutation<void, string>({
      query: (id) => ({
        url: `/label-templates/${encodeURIComponent(id)}`,
        method: "DELETE",
      }),
      invalidatesTags: ["LabelTemplate"],
    }),
  }),
});

export const {
  useListLabelTemplatesQuery,
  useCreateLabelTemplateMutation,
  useUpdateLabelTemplateMutation,
  useDeleteLabelTemplateMutation,
} = labelTemplatesApi;
