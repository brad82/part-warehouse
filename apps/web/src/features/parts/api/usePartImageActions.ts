import { useEffect, useState } from "react";
import { useGetCapabilitiesQuery } from "@shared/api/capabilitiesApi";
import { errorMessage } from "@shared/api/errors";
import type { PartImageActions, PartImageBusy } from "../model/partImageActions";
import {
  useDeletePartImageMutation,
  useScrapePartImageMutation,
  useSelectPartImageMutation,
  useUploadPartImageMutation,
} from "./partsApi";

type Failure = Parameters<typeof errorMessage>[0];

/** RTK Query wiring for the image panel (see PartImageActions). */
export function usePartImageActions(code: string | undefined): PartImageActions {
  const [upload, uploadState] = useUploadPartImageMutation();
  const [scrape, scrapeState] = useScrapePartImageMutation();
  const [select, selectState] = useSelectPartImageMutation();
  const [remove, removeState] = useDeletePartImageMutation();
  const capabilities = useGetCapabilitiesQuery();
  const [error, setError] = useState<string | null>(null);
  useEffect(() => setError(null), [code]);

  const busy: PartImageBusy = uploadState.isLoading
    ? "uploading"
    : scrapeState.isLoading
      ? "finding"
      : selectState.isLoading
        ? "choosing"
        : removeState.isLoading
          ? "removing"
          : null;

  /** Runs one command; on failure keeps a readable message instead of throwing. */
  const run = async (fallback: string, call: (code: string) => Promise<unknown>) => {
    if (!code) return;
    setError(null);
    try {
      await call(code);
    } catch (e) {
      setError(errorMessage(e as Failure, fallback) ?? fallback);
    }
  };

  return {
    canScrape: capabilities.data?.imageScraper ?? false,
    busy,
    error,
    clearError: () => setError(null),
    upload: (file) =>
      run("Couldn't upload that image.", (c) => upload({ code: c, file }).unwrap()),
    scrape: () =>
      run("Couldn't find an image on the supplier page.", (c) => scrape({ code: c }).unwrap()),
    select: (url) =>
      run("Couldn't use that image.", (c) => select({ code: c, url }).unwrap()),
    remove: () => run("Couldn't remove the image.", (c) => remove({ code: c }).unwrap()),
  };
}
