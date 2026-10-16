import { PART_CODE_PATTERN } from "./schemas.js";

/**
 * Pulls a part code out of scanned text. Accepts a bare code
 * (`A01-001-001`) or any text containing one, e.g. a URL ending
 * `/parts/A01-001-001`. Returns null when no code is present.
 */
export function parseScan(text: string): string | null {
  const match = text.trim().toUpperCase().match(PART_CODE_PATTERN);
  return match ? match[0] : null;
}
