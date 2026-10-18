import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";

export const API_BASE_URL = "/api";

export const baseApi = createApi({
  reducerPath: "api",
  baseQuery: fetchBaseQuery({ baseUrl: API_BASE_URL }),
  tagTypes: ["Part", "Grouping", "PartType", "AttributeDef", "PreviewColour", "LabelTemplate"],
  endpoints: () => ({}),
});
