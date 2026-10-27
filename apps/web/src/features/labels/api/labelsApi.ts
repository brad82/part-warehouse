import type { LabelPrintRequest } from "@parts-warehouse/shared";
import { API_BASE_URL, baseApi } from "@shared/api/baseApi";

export const labelsApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    /** Sends the label to the API's printer (see Capabilities.labelPrinter). */
    printLabel: build.mutation<
      { printer: string; copies: number },
      LabelPrintRequest
    >({
      query: (body) => ({ url: "/labels/print", method: "POST", body }),
    }),
  }),
});

export const { usePrintLabelMutation } = labelsApi;

/**
 * The label as a PDF, for printing in the browser. Plain fetch: a Blob
 * doesn't belong in the RTK Query cache.
 */
export async function fetchLabelPdf(body: LabelPrintRequest): Promise<Blob> {
  const res = await fetch(`${API_BASE_URL}/labels/pdf`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const data = (await res.json().catch(() => null)) as { message?: string } | null;
    throw new Error(data?.message ?? "Couldn't make the label PDF.");
  }
  return res.blob();
}
