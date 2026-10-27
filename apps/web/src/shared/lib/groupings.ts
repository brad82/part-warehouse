import type { Grouping, Part } from "@parts-warehouse/shared";

/** Grouping ids above a part code, for expanding to the selected part. */
export function ancestorIds(groupings: Grouping[], part: Part): string[] {
  const byId = new Map(groupings.map((g) => [g.id, g]));
  const ids: string[] = [];
  let current = byId.get(part.groupId);
  while (current) {
    ids.push(current.id);
    current = current.parentId ? byId.get(current.parentId) : undefined;
  }
  return ids;
}
