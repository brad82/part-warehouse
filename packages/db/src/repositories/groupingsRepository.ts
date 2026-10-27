import type Database from "better-sqlite3";
import type { Grouping, GroupingCreate, GroupingUpdate } from "@parts-warehouse/shared";
import { DomainError } from "../errors.js";

export type GroupingRow = {
  id: string;
  taxonomy: Grouping["taxonomy"];
  name: string;
  revision: number;
  parent_id: string | null;
};

function toGrouping(row: GroupingRow): Grouping {
  return {
    id: row.id,
    taxonomy: row.taxonomy,
    name: row.name,
    revision: row.revision,
    parentId: row.parent_id,
  };
}

/** All SQL for the BOM structure: modules, sub-assemblies and groups. */
export function groupingsRepository(db: Database.Database) {
  const getRow = db.prepare<[string], GroupingRow>("SELECT * FROM groupings WHERE id = ?");

  return {
    listGroupings(): Grouping[] {
      return db
        .prepare<[], GroupingRow>("SELECT * FROM groupings ORDER BY id")
        .all()
        .map(toGrouping);
    },

    updateGrouping(id: string, update: GroupingUpdate): Grouping | null {
      db.prepare(
        `UPDATE groupings
            SET name = COALESCE(@name, name),
                revision = COALESCE(@revision, revision)
          WHERE id = @id`,
      ).run({ name: update.name ?? null, revision: update.revision ?? null, id });
      const row = getRow.get(id);
      return row ? toGrouping(row) : null;
    },

    /** Adds a module, sub-assembly or group under the level above it. */
    createGrouping(input: GroupingCreate): Grouping {
      if (getRow.get(input.id)) {
        throw new DomainError(409, `${input.id} already exists`);
      }
      if (input.parentId !== null) {
        const parent = getRow.get(input.parentId);
        const expected = input.taxonomy === "group" ? "subassembly" : "module";
        if (parent?.taxonomy !== expected) {
          throw new DomainError(400, `Unknown ${expected} "${input.parentId}"`);
        }
      }
      db.prepare(
        `INSERT INTO groupings (id, taxonomy, name, revision, parent_id)
         VALUES (@id, @taxonomy, @name, 0, @parentId)`,
      ).run(input);
      return toGrouping(getRow.get(input.id)!);
    },

    /** Deletes an empty grouping. False when it doesn't exist. */
    deleteGrouping(id: string): boolean {
      const { children, parts } = db
        .prepare<[string, string], { children: number; parts: number }>(
          `SELECT (SELECT COUNT(*) FROM groupings WHERE parent_id = ?) AS children,
                  (SELECT COUNT(*) FROM parts WHERE group_id = ?) AS parts`,
        )
        .get(id, id)!;
      if (children > 0 || parts > 0) {
        throw new DomainError(409, `${id} isn't empty. Delete what's under it first.`);
      }
      return db.prepare("DELETE FROM groupings WHERE id = ?").run(id).changes > 0;
    },

    /** Import upsert; keeps the revision of an existing grouping. */
    upsertGrouping(g: Grouping): void {
      db.prepare(
        `INSERT INTO groupings (id, taxonomy, name, revision, parent_id)
         VALUES (@id, @taxonomy, @name, @revision, @parentId)
         ON CONFLICT (id) DO UPDATE SET
           taxonomy = excluded.taxonomy, name = excluded.name,
           parent_id = excluded.parent_id`,
      ).run(g);
    },
  };
}

export type GroupingsRepository = ReturnType<typeof groupingsRepository>;
