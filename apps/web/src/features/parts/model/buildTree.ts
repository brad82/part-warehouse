import type { Grouping, Part, Taxonomy } from "@parts-warehouse/shared";

export type TreeNode =
  | {
      kind: "grouping";
      id: string;
      taxonomy: Taxonomy;
      label: string;
      children: TreeNode[];
    }
  | { kind: "part"; id: string; label: string; part: Part };

/**
 * Builds Module → Sub-assembly → Group → Part from the flat lists. Groupings
 * with no parts underneath are dropped, so passing search results gives a
 * pruned tree. Knows nothing about expansion or selection.
 */
export function buildTree(groupings: Grouping[], parts: Part[]): TreeNode[] {
  const children = new Map<string | null, TreeNode[]>();
  const push = (key: string | null, node: TreeNode) => {
    const list = children.get(key) ?? [];
    list.push(node);
    children.set(key, list);
  };

  for (const part of parts) {
    push(part.groupId, { kind: "part", id: part.code, label: part.name, part });
  }

  function build(parentId: string | null): TreeNode[] {
    const nodes: TreeNode[] = [];
    for (const g of groupings.filter((x) => x.parentId === parentId)) {
      const kids = [...build(g.id), ...(children.get(g.id) ?? [])];
      if (kids.length === 0) continue;
      nodes.push({
        kind: "grouping",
        id: g.id,
        taxonomy: g.taxonomy,
        label: g.name,
        children: kids,
      });
    }
    return nodes;
  }

  return build(null);
}

/** Every grouping id in the tree: used to auto-expand search results. */
export function groupingIds(nodes: TreeNode[]): string[] {
  return nodes.flatMap((n) =>
    n.kind === "grouping" ? [n.id, ...groupingIds(n.children)] : [],
  );
}
