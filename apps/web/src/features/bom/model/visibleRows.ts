import type { GroupingRow } from "./groupingRows";

export type VisibleRow = GroupingRow & {
  /** Children are showing. Always true while filtering. */
  open: boolean;
  /** Shown only as a parent of a match; drawn muted. */
  context: boolean;
};

/**
 * The rows to draw. Without a query, a row shows when every level above it
 * is expanded. With one, matches on code or name (case-insensitive) show
 * with all their parents, everything open, and `expanded` is ignored.
 */
export function visibleRows(rows: GroupingRow[], expanded: Set<string>, query: string) {
  const q = query.trim().toLowerCase();
  const byId = new Map(rows.map((r) => [r.grouping.id, r]));
  const parents = (row: GroupingRow) => {
    const ids: string[] = [];
    for (let p = row.grouping.parentId; p; p = byId.get(p)?.grouping.parentId ?? null) ids.push(p);
    return ids;
  };

  if (!q) {
    return {
      searching: false,
      matches: 0,
      rows: rows
        .filter((r) => parents(r).every((id) => expanded.has(id)))
        .map((r) => ({ ...r, open: expanded.has(r.grouping.id), context: false })),
    };
  }

  const matched = new Set<string>();
  const shown = new Set<string>();
  for (const r of rows) {
    const { id, name } = r.grouping;
    if (id.toLowerCase().includes(q) || name.toLowerCase().includes(q)) {
      matched.add(id);
      shown.add(id);
      for (const p of parents(r)) shown.add(p);
    }
  }
  return {
    searching: true,
    matches: matched.size,
    rows: rows
      .filter((r) => shown.has(r.grouping.id))
      .map((r) => ({ ...r, open: true, context: !matched.has(r.grouping.id) })),
  };
}
