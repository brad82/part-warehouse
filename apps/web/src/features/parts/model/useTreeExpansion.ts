import { useEffect, useState } from "react";
import type { Grouping, Part } from "@parts-warehouse/shared";
import { ancestorIds } from "@shared/lib/groupings";
import { groupingIds, type TreeNode } from "./buildTree";

/**
 * Owns which tree branches are open. While searching, every branch of the
 * pruned tree is open; otherwise the user's own expansion is kept, plus the
 * path to the selected part. Knows nothing about how the tree is rendered.
 */
export function useTreeExpansion(
  tree: TreeNode[],
  searching: boolean,
  groupings: Grouping[],
  selected: Part | undefined,
) {
  const [expanded, setExpanded] = useState<string[]>([]);

  useEffect(() => {
    if (!selected) return;
    const path = ancestorIds(groupings, selected);
    setExpanded((current) => [...new Set([...current, ...path])]);
  }, [selected?.code, groupings]);

  return {
    expanded: searching ? groupingIds(tree) : expanded,
    setExpanded: searching ? () => {} : setExpanded,
  };
}
