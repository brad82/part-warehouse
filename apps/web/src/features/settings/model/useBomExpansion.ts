import { useState } from "react";
import type { GroupingRow } from "./groupingRows";

const STORAGE_KEY = "snowcat.bomStructure.expanded";

function load(): Set<string> | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? new Set(JSON.parse(raw) as string[]) : null;
  } catch {
    return null;
  }
}

function save(ids: Set<string>) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify([...ids]));
  } catch {
    // Private mode or blocked storage: expansion just isn't remembered.
  }
}

/**
 * Which BOM structure rows are open, remembered in this browser. Until the
 * user changes anything, only the first module is open.
 */
export function useBomExpansion(rows: GroupingRow[]) {
  const [stored, setStored] = useState(load);
  const firstModule = rows[0]?.grouping.id;
  const expanded = stored ?? new Set(firstModule ? [firstModule] : []);

  const update = (next: Set<string>) => {
    setStored(next);
    save(next);
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
