import type { Capabilities } from "@parts-warehouse/shared";
import { baseApi } from "./baseApi";

/** Optional modules the API has; fixed for the life of the server. */
export const capabilitiesApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    getCapabilities: build.query<Capabilities, void>({
      query: () => "/capabilities",
      keepUnusedDataFor: Infinity,
    }),
  }),
});

export const { useGetCapabilitiesQuery } = capabilitiesApi;
