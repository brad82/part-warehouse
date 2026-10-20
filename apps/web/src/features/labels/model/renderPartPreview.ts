import { fetchPartImageDataUrl } from "@shared/lib/partImage";
import { renderStlToPng } from "./renderStlToPng";

/**
 * The picture a label prints for a part: its STL render, or else its stored
 * image (bought parts have no CAD). A data URL, so printing never waits on
 * an image load. Null when the part has neither.
 */
export async function renderPartPreview(code: string): Promise<string | null> {
  return (await renderStlToPng(code)) ?? (await fetchPartImageDataUrl(code));
}
