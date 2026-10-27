import type {
  AttributeDef,
  Grouping,
  Part,
  PartType,
  PartUpdate,
  PreviewColour,
} from "@parts-warehouse/shared";
import { baseApi } from "./baseApi";

/** Tags to refetch after a change to one part: the list and that part. */
export const partInvalidates = (
  _result: unknown,
  _error: unknown,
  { code }: { code: string },
) => ["Part" as const, { type: "Part" as const, id: code }];

/**
 * The catalogue every screen reads: parts, the BOM structure, part types,
 * attribute definitions and STL preview colours. Screen-specific writes live
 * in their features (partsApi, settingsApi).
 */
export const catalogApi = baseApi.injectEndpoints({
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
      invalidatesTags: partInvalidates,
    }),
    listGroupings: build.query<Grouping[], void>({
      query: () => "/groupings",
      providesTags: ["Grouping"],
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
  }),
});

export const {
  useListPartsQuery,
  useGetPartQuery,
  useLazyGetPartQuery,
  useUpdatePartMutation,
  useListGroupingsQuery,
  useListPartTypesQuery,
  useListAttributeDefsQuery,
  useListPreviewColoursQuery,
} = catalogApi;
