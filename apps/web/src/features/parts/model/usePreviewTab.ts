import { useState } from "react";

export type PreviewTab = "model" | "image";

const STORAGE_KEY = "partPreviewTab";

function loadTab(): PreviewTab | null {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved === "model" || saved === "image" ? saved : null;
  } catch {
    return null;
  }
}

/**
 * The tab a part opens on: with both an STL and an image, the tab last
 * picked (remembered per browser); otherwise whichever it has, the model
 * first. Mount once per part (key by code) so a pick doesn't carry over
 * when the other part lacks that preview.
 */
export function defaultPreviewTab(hasModel: boolean, hasImage: boolean): PreviewTab {
  if (hasModel && hasImage) return loadTab() ?? "model";
  return hasModel ? "model" : "image";
}

export function usePreviewTab(hasModel: boolean, hasImage: boolean) {
  const [picked, setPicked] = useState<PreviewTab | null>(null);
  const tab = picked ?? defaultPreviewTab(hasModel, hasImage);

  function pick(next: PreviewTab) {
    try {
      localStorage.setItem(STORAGE_KEY, next);
    } catch {
      // Storage blocked: the choice just won't persist.
    }
    setPicked(next);
  }

  return [tab, pick] as const;
}
