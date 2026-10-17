import type { Grouping, Taxonomy } from "@snowcat/shared";

const LETTERS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";

/** Code prefix and number width for a new grouping under `parentId`. */
export function codePrefix(taxonomy: Taxonomy, parentId: string | null) {
  if (taxonomy === "module") return "";
  return taxonomy === "group" ? `${parentId}-` : (parentId ?? "");
}

/**
 * Lowest unused code for a new grouping: a letter for a module, then
 * 01..99 / 001..999 under the parent. Lowest rather than highest + 1, so
 * A07 comes before A21 when A20 (hardware) exists. Null when full.
 */
export function nextGroupingId(
  groupings: Grouping[],
  taxonomy: Taxonomy,
  parentId: string | null,
): string | null {
  const taken = new Set(groupings.map((g) => g.id));
  if (taxonomy === "module") {
    return [...LETTERS].find((l) => !taken.has(l)) ?? null;
  }
  const width = taxonomy === "group" ? 3 : 2;
  const prefix = codePrefix(taxonomy, parentId);
  for (let n = 1; n < 10 ** width; n++) {
    const id = prefix + String(n).padStart(width, "0");
    if (!taken.has(id)) return id;
  }
  return null;
}
