import { partUpdateSchema, type PartUpdate } from "@snowcat/shared";
import type { CatalogRow } from "./buildRows";

/** Fields the grid lets you edit inline. */
export const EDITABLE_FIELDS = ["onHand", "status"] as const;

/**
 * The validated PATCH body for an inline edit, or null when nothing editable
 * changed. Throws a readable error if the new value is invalid.
 */
export function rowUpdate(next: CatalogRow, prev: CatalogRow): PartUpdate | null {
  const changed = EDITABLE_FIELDS.filter((f) => next[f] !== prev[f]);
  if (changed.length === 0) return null;

  const result = partUpdateSchema.safeParse(
    Object.fromEntries(changed.map((f) => [f, next[f]])),
  );
  if (!result.success) {
    throw new Error(`Invalid ${changed.join(", ")} for ${next.code}`);
  }
  return result.data;
}
