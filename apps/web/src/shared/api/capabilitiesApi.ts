import type { Capabilities } from "@parts-warehouse/shared";
import { baseApi } from "./baseApi";

/** Optional modules the API has, and its label printer (Settings). */
export const capabilitiesApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    getCapabilities: build.query<Capabilities, void>({
      query: () => "/capabilities",
      keepUnusedDataFor: Infinity,
      providesTags: ["Capabilities"],
    }),
  }),
});

export const { useGetCapabilitiesQuery } = capabilitiesApi;
