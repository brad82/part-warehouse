import type { Part, PartCreate } from "@parts-warehouse/shared";
import { baseApi } from "@shared/api/baseApi";
import { partInvalidates } from "@shared/api/catalogApi";

/** The parts screen's own writes: images, new parts, open in slicer. Reads are in catalogApi. */
export const partsApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    uploadPartImage: build.mutation<Part, { code: string; file: File }>({
      query: ({ code, file }) => {
        const body = new FormData();
        body.append("file", file);
        return { url: `/parts/${code}/image`, method: "PUT", body };
      },
      invalidatesTags: partInvalidates,
    }),
    scrapePartImage: build.mutation<Part, { code: string }>({
      query: ({ code }) => ({
        url: `/parts/${code}/image/scrape`,
        method: "POST",
      }),
      invalidatesTags: partInvalidates,
    }),
    selectPartImage: build.mutation<Part, { code: string; url: string }>({
      query: ({ code, url }) => ({
        url: `/parts/${code}/image/select`,
        method: "POST",
        body: { url },
      }),
      invalidatesTags: partInvalidates,
    }),
    deletePartImage: build.mutation<Part, { code: string }>({
      query: ({ code }) => ({ url: `/parts/${code}/image`, method: "DELETE" }),
      invalidatesTags: partInvalidates,
    }),
    openInSlicer: build.mutation<void, string>({
      query: (code) => ({
        url: `/parts/${code}/open-in-slicer`,
        method: "POST",
      }),
    }),
    createPart: build.mutation<Part, PartCreate>({
      query: (body) => ({ url: "/parts", method: "POST", body }),
      invalidatesTags: ["Part"],
    }),
    nextPartNumber: build.query<{ part: string | null }, string>({
      query: (groupId) => `/groupings/${groupId}/next-part`,
      keepUnusedDataFor: 0,
    }),
  }),
});

export const {
  useCreatePartMutation,
  useOpenInSlicerMutation,
  useUploadPartImageMutation,
  useScrapePartImageMutation,
  useSelectPartImageMutation,
  useDeletePartImageMutation,
  useLazyNextPartNumberQuery,
} = partsApi;
