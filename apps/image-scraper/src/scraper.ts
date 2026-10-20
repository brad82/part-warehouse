import type { ImageScraper } from "@parts-warehouse/image-scraper-proto";
import type { PageRenderer } from "./lib/pageRenderer.js";
import { fetchImage, scrapeImageCandidates, type Fetch } from "./lib/scrapeImages.js";

/** The ImageScraper service: plain fetch first, the browser as fallback. */
export function createScraper({
  fetch: fetchFn = fetch,
  renderer = null,
}: {
  fetch?: Fetch;
  renderer?: PageRenderer | null;
} = {}): ImageScraper {
  return {
    findImages: (pageUrl) => scrapeImageCandidates(fetchFn, pageUrl, renderer),
    fetchImage: (url) => fetchImage(fetchFn, url),
  };
}
