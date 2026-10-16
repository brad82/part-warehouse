import type { Grouping, Part, PartType } from "@snowcat/shared";
import { partTotals } from "@features/parts";

export type CatalogRow = Part & {
  partType: string;
  subassembly: string;
  group: string;
  remaining: number;
  totalPrintTimeMin: number | null;
  totalFilamentG: number | null;
};

/** Flattens parts into grid rows with type and grouping names and per-build totals. */
export function buildRows(
  groupings: Grouping[],
  parts: Part[],
  partTypes: PartType[] = [],
): CatalogRow[] {
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
      remaining: totals.remaining,
      totalPrintTimeMin: totals.printTimeMin,
      totalFilamentG: totals.filamentG,
    };
  });
}
