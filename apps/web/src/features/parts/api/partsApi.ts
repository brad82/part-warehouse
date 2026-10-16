import type {
  AttributeDef,
  Grouping,
  Part,
  PartCreate,
  PartType,
  PartUpdate,
  PreviewColour,
} from "@snowcat/shared";
import { baseApi } from "@shared/api/baseApi";

export const partsApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    listParts: build.query<Part[], string | void>({
      query: (q) => ({ url: "/parts", params: q ? { q } : undefined }),
      providesTags: ["Part"],
    }),
    getPart: build.query<Part, string>({
      query: (code) => `/parts/${code}`,
      providesTags: (_result, _error, code) => [{ type: "Part", id: code }],
    }),
    updatePart: build.mutation<Part, { code: string; update: PartUpdate }>({
      query: ({ code, update }) => ({
        url: `/parts/${code}`,
        method: "PATCH",
        body: update,
      }),
      invalidatesTags: (_result, _error, { code }) => [
        "Part",
        { type: "Part", id: code },
      ],
    }),
    openInSlicer: build.mutation<void, string>({
      query: (code) => ({ url: `/parts/${code}/open-in-slicer`, method: "POST" }),
    }),
    createPart: build.mutation<Part, PartCreate>({
      query: (body) => ({ url: "/parts", method: "POST", body }),
      invalidatesTags: ["Part"],
    }),
    nextPartNumber: build.query<{ part: string | null }, string>({
      query: (groupId) => `/groupings/${groupId}/next-part`,
      keepUnusedDataFor: 0,
    }),
    listPartTypes: build.query<PartType[], void>({
      query: () => "/part-types",
      providesTags: ["PartType"],
    }),
    listAttributeDefs: build.query<AttributeDef[], void>({
      query: () => "/attributes",
      providesTags: ["AttributeDef"],
    }),
    listPreviewColours: build.query<PreviewColour[], void>({
      query: () => "/preview-colours",
      providesTags: ["PreviewColour"],
    }),
    listGroupings: build.query<Grouping[], void>({
      query: () => "/groupings",
      providesTags: ["Grouping"],
    }),
  }),
});

export const {
  useListPreviewColoursQuery,
  useListPartsQuery,
  useGetPartQuery,
  useLazyGetPartQuery,
  useUpdatePartMutation,
  useCreatePartMutation,
  useOpenInSlicerMutation,
  useLazyNextPartNumberQuery,
  useListPartTypesQuery,
  useListAttributeDefsQuery,
  useListGroupingsQuery,
} = partsApi;
