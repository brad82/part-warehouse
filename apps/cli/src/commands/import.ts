/**
 * Imports `Parts Index.csv` into SQLite. Re-runnable: groupings and the
 * catalog columns of parts are upserted, plus the colour, material, file
 * path and file version attributes. On hand, status, part type and every
 * other attribute (print time, filament, …) are never touched.
 */
import { readFileSync } from "node:fs";
import type Database from "better-sqlite3";
import { openDb, partsRepository } from "@snowcat/db";
import { ATTR } from "@snowcat/shared";
import { splitColourMaterial } from "../lib/colourMaterial.js";
import { parseCsv } from "../lib/csv.js";

export type ImportCounts = {
  parts: number;
  module: number;
  subassembly: number;
  group: number;
};

export function importPartsIndex(db: Database.Database, csv: string): ImportCounts {
  const repo = partsRepository(db);
  const [header, ...rows] = parseCsv(csv);
  const col = (name: string) => {
    const index = header.indexOf(name);
    if (index < 0) throw new Error(`Parts Index.csv is missing "${name}"`);
    return index;
  };
  const c = {
    code: col("Code"),
    module: col("Module"),
    moduleName: col("Module name"),
    sub: col("Sub-assembly"),
    subName: col("Sub-assembly name"),
    group: col("Group"),
    groupName: col("Group name"),
    part: col("Part"),
    revision: col("Revision"),
    name: col("Part name"),
    qty: col("Qty per build"),
    material: col("Colour / material"),
    fileVersion: col("File version"),
    filePath: col("File path"),
    notes: col("Notes"),
  };
  const orNull = (s: string | undefined) => (s?.trim() ? s.trim() : null);

  const counts: ImportCounts = { parts: 0, module: 0, subassembly: 0, group: 0 };
  const seen = new Set<string>();

  db.transaction(() => {
    for (const r of rows) {
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
        counts[level.taxonomy]++;
      }
      const { colour, material } = splitColourMaterial(r[c.material] ?? "");
      repo.upsertCatalogPart({
        code: r[c.code],
        groupId,
        part: r[c.part],
        revision: Number(r[c.revision] || 0),
        name: r[c.name],
        qtyPerBuild: Number(r[c.qty] || 1),
        notes: orNull(r[c.notes]),
        source: "csv",
        attributes: {
          [ATTR.colour]: colour,
          [ATTR.material]: material,
          [ATTR.fileVersion]: orNull(r[c.fileVersion]),
          [ATTR.filePath]: orNull(r[c.filePath]),
        },
      });
      counts.parts++;
    }
  })();
  return counts;
}

export function runImport({ csvPath, dbPath }: { csvPath: string; dbPath: string }) {
  const db = openDb(dbPath);
  try {
    const counts = importPartsIndex(db, readFileSync(csvPath, "utf8"));
    console.log(
      `Imported ${counts.parts} parts, ${counts.module} modules, ` +
        `${counts.subassembly} sub-assemblies, ${counts.group} groups into ${dbPath}`,
    );
  } finally {
    db.close();
  }
}
