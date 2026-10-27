import type { PartImage } from "@parts-warehouse/shared";
import { API_BASE_URL } from "@shared/api/baseApi";

/** A part's stored image. Versioned, so a new image is never served from cache. */
export const partImageUrl = (
  code: string,
  image: Pick<PartImage, "updatedAt">,
) =>
  `${API_BASE_URL}/parts/${code}/image?v=${encodeURIComponent(image.updatedAt)}`;

/** The part's image as a data URL, or null if it has none. */
export async function fetchPartImageDataUrl(
  code: string,
): Promise<string | null> {
  try {
    const res = await fetch(`${API_BASE_URL}/parts/${code}/image`);
    if (!res.ok) return null;
    const blob = await res.blob();
    return await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = () => reject(reader.error);
      reader.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
}
