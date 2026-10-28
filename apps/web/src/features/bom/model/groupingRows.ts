import type { Grouping, Part } from "@parts-warehouse/shared";

export type GroupingRow = {
  grouping: Grouping;
  depth: number;
  /** Direct child groupings. */
  children: number;
  /** Parts anywhere underneath. */
  parts: number;
};

/** Groupings depth-first (module → sub-assembly → group) with their counts. */
export function groupingRows(
  groupings: Grouping[],
  parts: Part[],
): GroupingRow[] {
  const direct = new Map<string, number>();
  for (const p of parts)
    direct.set(p.groupId, (direct.get(p.groupId) ?? 0) + 1);

  const rows: GroupingRow[] = [];
  function walk(parentId: string | null, depth: number): number {
    let total = 0;
    for (const g of groupings.filter((x) => x.parentId === parentId)) {
      const row: GroupingRow = { grouping: g, depth, children: 0, parts: 0 };
      rows.push(row);
      row.children = groupings.filter((x) => x.parentId === g.id).length;
      row.parts = (direct.get(g.id) ?? 0) + walk(g.id, depth + 1);
      total += row.parts;
    }
    return total;
  }
  walk(null, 0);
  return rows;
}
