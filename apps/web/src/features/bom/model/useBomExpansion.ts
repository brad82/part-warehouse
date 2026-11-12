import { useState } from "react";
import { useActiveProject } from "@shared/hooks/useActiveProject";
import type { GroupingRow } from "./groupingRows";

// Grouping ids are per project, so each project has its own key.
const storageKey = (project: string) =>
  `parts-warehouse.bomStructure.expanded.${project}`;

function load(key: string): Set<string> | null {
  try {
    const raw = localStorage.getItem(key);
    return raw ? new Set(JSON.parse(raw) as string[]) : null;
  } catch {
    return null;
  }
}

function save(key: string, ids: Set<string>) {
  try {
    localStorage.setItem(key, JSON.stringify([...ids]));
  } catch {
    // Private mode or blocked storage: expansion just isn't remembered.
  }
}

/**
 * Which BOM structure rows are open, remembered in this browser. Until the
 * user changes anything, only the first module is open.
 */
export function useBomExpansion(rows: GroupingRow[]) {
  const key = storageKey(useActiveProject());
  const [stored, setStored] = useState(() => load(key));
  const firstModule = rows[0]?.grouping.id;
  const expanded = stored ?? new Set(firstModule ? [firstModule] : []);

  const update = (next: Set<string>) => {
    setStored(next);
    save(key, next);
  };

  return {
    expanded,
    toggle: (id: string) => {
      const next = new Set(expanded);
      if (!next.delete(id)) next.add(id);
      update(next);
    },
    expandAll: () => update(new Set(rows.filter((r) => r.children > 0).map((r) => r.grouping.id))),
    collapseAll: () => update(new Set()),
  };
}
