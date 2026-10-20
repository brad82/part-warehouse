import type { Taxonomy } from "@parts-warehouse/shared";

export const TAXONOMY_LABELS: Record<Taxonomy, string> = {
  module: "Module",
  subassembly: "Sub-assembly",
  group: "Group",
};

/** The level a grouping's children sit at; groups hold parts instead. */
export const CHILD_TAXONOMY: Record<Taxonomy, Taxonomy | null> = {
  module: "subassembly",
  subassembly: "group",
  group: null,
};

const PLURALS: Record<Taxonomy, string> = {
  module: "modules",
  subassembly: "sub-assemblies",
  group: "groups",
};

/** "1 group", "6 groups", "7 sub-assemblies". */
export function countLabel(n: number, taxonomy: Taxonomy) {
  return `${n} ${n === 1 ? TAXONOMY_LABELS[taxonomy].toLowerCase() : PLURALS[taxonomy]}`;
}
