import type Database from "better-sqlite3";
import {
  parseAttributeValue,
  type AttributeDef,
  type AttributeDefCreate,
  type AttributeDefUpdate,
  type PartType,
  type PartTypeCreate,
  type PartTypeUpdate,
} from "@snowcat/shared";
import { DomainError } from "../errors.js";

type AttributeDefRow = {
  id: number;
  key: string;
  label: string;
  data_type: AttributeDef["dataType"];
  unit: string | null;
  options: string | null;
  system: number;
  sort: number;
  part_type_ids: string | null;
};

function toAttributeDef(row: AttributeDefRow): AttributeDef {
  return {
    id: row.id,
    key: row.key,
    label: row.label,
    dataType: row.data_type,
    unit: row.unit,
    options: row.options ? (JSON.parse(row.options) as string[]) : null,
    system: row.system === 1,
    sort: row.sort,
    partTypeIds: row.part_type_ids ? row.part_type_ids.split(",") : [],
  };
}

const SELECT_DEFS = `
  SELECT d.*, (SELECT group_concat(pta.part_type_id)
                 FROM part_type_attributes pta
                WHERE pta.attribute_id = d.id) AS part_type_ids
    FROM attribute_defs d`;

/** Part types and attribute definitions (the Settings page). */
export function attributesRepository(db: Database.Database) {
  const setPartTypes = (attributeId: number, partTypeIds: string[]) => {
    db.prepare("DELETE FROM part_type_attributes WHERE attribute_id = ?").run(attributeId);
    const insert = db.prepare(
      "INSERT INTO part_type_attributes (part_type_id, attribute_id) VALUES (?, ?)",
    );
    for (const typeId of new Set(partTypeIds)) {
      if (!repo.getPartType(typeId)) {
        throw new DomainError(400, `Unknown part type "${typeId}"`);
      }
      insert.run(typeId, attributeId);
    }
  };

  const assertKeyFree = (key: string, exceptId?: number) => {
    const row = db
      .prepare<[string], { id: number }>("SELECT id FROM attribute_defs WHERE key = ?")
      .get(key);
    if (row && row.id !== exceptId) {
      throw new DomainError(409, `An attribute with key "${key}" already exists`);
    }
  };

  const repo = {
    listPartTypes(): PartType[] {
      return db
        .prepare<[], PartType>("SELECT id, name, sort FROM part_types ORDER BY sort, name")
        .all();
    },

    getPartType(id: string): PartType | null {
      return (
        db
          .prepare<[string], PartType>("SELECT id, name, sort FROM part_types WHERE id = ?")
          .get(id) ?? null
      );
    },

    createPartType(input: PartTypeCreate): PartType {
      if (repo.getPartType(input.id)) {
        throw new DomainError(409, `Part type "${input.id}" already exists`);
      }
      const sort =
        input.sort ??
        db.prepare<[], { s: number }>("SELECT COALESCE(MAX(sort), 0) + 1 AS s FROM part_types").get()!.s;
      db.prepare("INSERT INTO part_types (id, name, sort) VALUES (?, ?, ?)").run(
        input.id,
        input.name,
        sort,
      );
      return repo.getPartType(input.id)!;
    },

    updatePartType(id: string, update: PartTypeUpdate): PartType | null {
      db.prepare(
        `UPDATE part_types SET name = COALESCE(@name, name), sort = COALESCE(@sort, sort)
          WHERE id = @id`,
      ).run({ name: update.name ?? null, sort: update.sort ?? null, id });
      return repo.getPartType(id);
    },

    deletePartType(id: string): boolean {
      const used = db
        .prepare<[string], { n: number }>("SELECT COUNT(*) AS n FROM parts WHERE part_type_id = ?")
        .get(id)!.n;
      if (used > 0) {
        throw new DomainError(409, `${used} part(s) use this type; change them first`);
      }
      return db.prepare("DELETE FROM part_types WHERE id = ?").run(id).changes > 0;
    },

    listAttributeDefs(): AttributeDef[] {
      return db
        .prepare<[], AttributeDefRow>(`${SELECT_DEFS} ORDER BY d.sort, d.label`)
        .all()
        .map(toAttributeDef);
    },

    getAttributeDef(id: number): AttributeDef | null {
      const row = db.prepare<[number], AttributeDefRow>(`${SELECT_DEFS} WHERE d.id = ?`).get(id);
      return row ? toAttributeDef(row) : null;
    },

    createAttributeDef(input: AttributeDefCreate): AttributeDef {
      return db.transaction(() => {
        assertKeyFree(input.key);
        const sort =
          input.sort ??
          db
            .prepare<[], { s: number }>("SELECT COALESCE(MAX(sort), 0) + 10 AS s FROM attribute_defs")
            .get()!.s;
        const { lastInsertRowid } = db
          .prepare(
            `INSERT INTO attribute_defs (key, label, data_type, unit, options, sort)
             VALUES (@key, @label, @dataType, @unit, @options, @sort)`,
          )
          .run({
            key: input.key,
            label: input.label,
            dataType: input.dataType,
            unit: input.unit || null,
            options: input.dataType === "select" ? JSON.stringify(input.options) : null,
            sort,
          });
        const id = Number(lastInsertRowid);
        setPartTypes(id, input.partTypeIds ?? []);
        return repo.getAttributeDef(id)!;
      })();
    },

    updateAttributeDef(id: number, update: AttributeDefUpdate): AttributeDef | null {
      return db.transaction(() => {
        const current = repo.getAttributeDef(id);
        if (!current) return null;
        if (current.system) {
          if (update.key !== undefined && update.key !== current.key) {
            throw new DomainError(400, `"${current.label}" is built in; its key can't change`);
          }
          if (update.dataType !== undefined && update.dataType !== current.dataType) {
            throw new DomainError(400, `"${current.label}" is built in; its type can't change`);
          }
        }
        if (update.key !== undefined) assertKeyFree(update.key, id);
        const dataType = update.dataType ?? current.dataType;
        const options = update.options !== undefined ? update.options : current.options;
        if (dataType === "select" && !options?.length) {
          throw new DomainError(400, "A select needs at least one option");
        }
        if (dataType !== current.dataType) {
          const bad = db
            .prepare<[number], { value: string }>(
              "SELECT value FROM part_attributes WHERE attribute_id = ?",
            )
            .all(id)
            .filter((r) => !parseAttributeValue({ dataType, options }, r.value).ok).length;
          if (bad > 0) {
            throw new DomainError(
              409,
              `${bad} part(s) have ${current.label} values that aren't a valid ${dataType}`,
            );
          }
        }
        db.prepare(
          `UPDATE attribute_defs
              SET key = @key, label = @label, data_type = @dataType,
                  unit = @unit, options = @options, sort = @sort
            WHERE id = @id`,
        ).run({
          id,
          key: update.key ?? current.key,
          label: update.label ?? current.label,
          dataType,
          unit: (update.unit !== undefined ? update.unit : current.unit) || null,
          options: dataType === "select" ? JSON.stringify(options) : null,
          sort: update.sort ?? current.sort,
        });
        if (update.partTypeIds) setPartTypes(id, update.partTypeIds);
        return repo.getAttributeDef(id);
      })();
    },

    /** Deletes the definition and every part's value for it. */
    deleteAttributeDef(id: number): boolean {
      const current = repo.getAttributeDef(id);
      if (!current) return false;
      if (current.system) {
        throw new DomainError(400, `"${current.label}" is built in and can't be deleted`);
      }
      db.prepare("DELETE FROM attribute_defs WHERE id = ?").run(id);
      return true;
    },
  };
  return repo;
}

export type AttributesRepository = ReturnType<typeof attributesRepository>;
