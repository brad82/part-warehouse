/** What the image panel is busy doing, if anything. */
export type PartImageBusy = "uploading" | "finding" | "choosing" | "removing" | null;

/**
 * The selected part's image commands, injected by PartsContainer so the
 * view never calls RTK Query. Each one reports failure through `error`.
 */
export type PartImageActions = {
  /** The API has the image-scraper module, so supplier links can be fetched. */
  canScrape: boolean;
  busy: PartImageBusy;
  error: string | null;
  clearError: () => void;
  upload: (file: File) => Promise<void>;
  /** Fetches the supplier link and keeps its best image. */
  scrape: () => Promise<void>;
  /** Swaps to another image the last scrape found. */
  select: (url: string) => Promise<void>;
  remove: () => Promise<void>;
};
