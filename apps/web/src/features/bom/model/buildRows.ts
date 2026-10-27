import type { Grouping, Part, PartType } from "@parts-warehouse/shared";
import { ancestorIds } from "@shared/lib/groupings";
import { partTotals } from "@shared/lib/totals";

export type BomRow = Part & {
  partType: string;
  subassembly: string;
  group: string;
  /** The part's group and every grouping above it. */
  groupPath: string[];
  remaining: number;
  totalPrintTimeMin: number | null;
  totalFilamentG: number | null;
};

/** Flattens parts into grid rows with type and grouping names and per-build totals. */
export function buildRows(
  groupings: Grouping[],
  parts: Part[],
  partTypes: PartType[] = [],
): BomRow[] {
  const byId = new Map(groupings.map((g) => [g.id, g]));
  const typeNames = new Map(partTypes.map((t) => [t.id, t.name]));
  const label = (g: Grouping | undefined) => (g ? `${g.id} ${g.name}` : "");

  return parts.map((part) => {
    const group = byId.get(part.groupId);
    const subassembly = group?.parentId ? byId.get(group.parentId) : undefined;
    const totals = partTotals(part);
    return {
      ...part,
      partType: typeNames.get(part.partTypeId) ?? part.partTypeId,
      subassembly: label(subassembly),
      group: label(group),
      groupPath: ancestorIds(groupings, part),
      remaining: totals.remaining,
      totalPrintTimeMin: totals.printTimeMin,
      totalFilamentG: totals.filamentG,
    };
  });
}

/** Rows whose part sits anywhere under the given grouping. */
export function rowsInGrouping(rows: BomRow[], groupingId: string): BomRow[] {
  return rows.filter((row) => row.groupPath.includes(groupingId));
}
