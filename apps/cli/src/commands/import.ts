/**
 * Imports a parts CSV (`Parts Index.csv`, purchased parts, …) into SQLite.
 * Re-runnable: groupings and the catalog columns of parts are upserted.
 *
 * - Core columns (code, grouping, name, qty, notes) are required.
 * - `Part type` (optional) sets each row's type by id or name. Without it,
 *   existing parts keep their type and new ones are Printed.
 * - `Colour / material` is split into the colour and material attributes.
 * - Any other column is matched to an attribute by key or label (ignoring
 *   case); unmatched columns are skipped and reported. An empty cell clears
 *   that attribute.
 *
 * On hand, status and attributes with no column are never touched.
 */
import { readFileSync } from "node:fs";
import type Database from "better-sqlite3";
import { attributesRepository, openDb, partsRepository } from "@snowcat/db";
import { ATTR } from "@snowcat/shared";
import { splitColourMaterial } from "../lib/colourMaterial.js";
import { parseCsv } from "../lib/csv.js";

export type ImportResult = {
  parts: number;
  module: number;
  subassembly: number;
  group: number;
  skippedColumns: string[];
};

const CORE = {
  code: "Code",
  module: "Module",
  moduleName: "Module name",
  sub: "Sub-assembly",
  subName: "Sub-assembly name",
  group: "Group",
  groupName: "Group name",
  part: "Part",
  revision: "Revision",
  name: "Part name",
  qty: "Qty per build",
  notes: "Notes",
} as const;
const PART_TYPE = "part type";
const COLOUR_MATERIAL = "colour / material";

export function importParts(db: Database.Database, csv: string): ImportResult {
  const repo = partsRepository(db);
  const attrs = attributesRepository(db);
  const [header, ...rows] = parseCsv(csv);
  const lower = header.map((h) => h.trim().toLowerCase());

  const c = Object.fromEntries(
    Object.entries(CORE).map(([k, name]) => {
      const index = lower.indexOf(name.toLowerCase());
      if (index < 0) throw new Error(`CSV is missing "${name}"`);
      return [k, index];
    }),
  ) as Record<keyof typeof CORE, number>;
  const typeCol = lower.indexOf(PART_TYPE);
  const colourMaterialCol = lower.indexOf(COLOUR_MATERIAL);

  const defsByName = new Map<string, string>();
  for (const d of attrs.listAttributeDefs()) {
    defsByName.set(d.label.toLowerCase(), d.key);
    defsByName.set(d.key.toLowerCase(), d.key);
  }
  const handled = new Set([...Object.values(c), typeCol, colourMaterialCol]);
  const attrCols: { index: number; key: string }[] = [];
  const skippedColumns: string[] = [];
  lower.forEach((name, index) => {
    if (handled.has(index) || name === "") return;
    const key = defsByName.get(name);
    if (key) attrCols.push({ index, key });
    else skippedColumns.push(header[index]);
  });

  const typesByName = new Map<string, string>();
  for (const t of attrs.listPartTypes()) {
    typesByName.set(t.name.toLowerCase(), t.id);
    typesByName.set(t.id.toLowerCase(), t.id);
  }
  const orNull = (s: string | undefined) => (s?.trim() ? s.trim() : null);

  const result: ImportResult = { parts: 0, module: 0, subassembly: 0, group: 0, skippedColumns };
  const seen = new Set<string>();

  db.transaction(() => {
    rows.forEach((r, i) => {
      const where = `Row ${i + 2} (${r[c.code]})`;
      const moduleId = r[c.module];
      const subId = r[c.sub];
      const groupId = `${subId}-${r[c.group]}`;
      const levels = [
        { id: moduleId, taxonomy: "module", name: r[c.moduleName], parentId: null },
        { id: subId, taxonomy: "subassembly", name: r[c.subName], parentId: moduleId },
        { id: groupId, taxonomy: "group", name: r[c.groupName], parentId: subId },
      ] as const;
      for (const level of levels) {
        if (seen.has(level.id)) continue;
        seen.add(level.id);
        repo.upsertGrouping({ ...level, revision: 0 });
        result[level.taxonomy]++;
      }

      let partTypeId: string | undefined;
      if (typeCol >= 0) {
        const raw = r[typeCol]?.trim() ?? "";
        partTypeId = typesByName.get(raw.toLowerCase());
        if (!partTypeId) throw new Error(`${where}: unknown part type "${raw}"`);
      }
      const attributes: Record<string, string | null> = {};
      if (colourMaterialCol >= 0) {
        const { colour, material } = splitColourMaterial(r[colourMaterialCol] ?? "");
        attributes[ATTR.colour] = colour;
        attributes[ATTR.material] = material;
      }
      for (const { index, key } of attrCols) attributes[key] = orNull(r[index]);

      try {
        repo.upsertCatalogPart({
          code: r[c.code],
          groupId,
          part: r[c.part],
          revision: Number(r[c.revision] || 0),
          name: r[c.name],
          qtyPerBuild: Number(r[c.qty] || 1),
          notes: orNull(r[c.notes]),
          source: "csv",
          partTypeId,
          attributes,
        });
      } catch (error) {
        throw new Error(`${where}: ${(error as Error).message}`);
      }
      result.parts++;
    });
  })();
  return result;
}

export function runImport({ csvPath, dbPath }: { csvPath: string; dbPath: string }) {
  const db = openDb(dbPath);
  try {
    const r = importParts(db, readFileSync(csvPath, "utf8"));
    console.log(
      `Imported ${r.parts} parts, ${r.module} modules, ` +
        `${r.subassembly} sub-assemblies, ${r.group} groups into ${dbPath}`,
    );
    if (r.skippedColumns.length) {
      console.warn(`Skipped columns (no matching attribute): ${r.skippedColumns.join(", ")}`);
    }
  } finally {
    db.close();
  }
}
