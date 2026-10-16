import type Database from "better-sqlite3";
import {
  isNumericAttribute,
  parseAttributeValue,
  type AttributeDef,
  type AttributeValue,
  type Grouping,
  type GroupingUpdate,
  type Part,
  type PartCreate,
  type PartUpdate,
} from "@snowcat/shared";
import { DomainError } from "../errors.js";

type PartRow = {
  code: string;
  group_id: string;
  part: string;
  revision: number;
  name: string;
  part_type_id: string;
  qty_per_build: number;
  notes: string | null;
  on_hand: number;
  status: Part["status"];
  source: string;
  updated_at: string;
};

type GroupingRow = {
  id: string;
  taxonomy: Grouping["taxonomy"];
  name: string;
  revision: number;
  parent_id: string | null;
};

type AttributeRow = {
  part_code: string;
  key: string;
  data_type: AttributeDef["dataType"];
  value: string;
};

type Attributes = Part["attributes"];

function toPart(row: PartRow, attributes: Attributes = {}): Part {
  return {
    code: row.code,
    groupId: row.group_id,
    part: row.part,
    revision: row.revision,
    name: row.name,
    partTypeId: row.part_type_id,
    qtyPerBuild: row.qty_per_build,
    notes: row.notes,
    onHand: row.on_hand,
    attributes,
    status: row.status,
    source: row.source,
    updatedAt: row.updated_at,
  };
}

function toGrouping(row: GroupingRow): Grouping {
  return {
    id: row.id,
    taxonomy: row.taxonomy,
    name: row.name,
    revision: row.revision,
    parentId: row.parent_id,
  };
}

/** API field name → column, for the editable core fields only. */
const partUpdateColumns: Record<Exclude<keyof PartUpdate, "attributes">, string> = {
  name: "name",
  revision: "revision",
  partTypeId: "part_type_id",
  qtyPerBuild: "qty_per_build",
  notes: "notes",
  onHand: "on_hand",
  status: "status",
};

const SELECT_ATTRIBUTES = `
  SELECT pa.part_code, d.key, d.data_type, pa.value
    FROM part_attributes pa
    JOIN attribute_defs d ON d.id = pa.attribute_id`;

/** Groups attribute rows by part, numeric types back to numbers. */
function foldAttributes(rows: AttributeRow[]): Map<string, Attributes> {
  const byPart = new Map<string, Attributes>();
  for (const r of rows) {
    const attrs = byPart.get(r.part_code) ?? {};
    attrs[r.key] = isNumericAttribute({ dataType: r.data_type }) ? Number(r.value) : r.value;
    byPart.set(r.part_code, attrs);
  }
  return byPart;
}

/** All SQL for parts and groupings. Routes never touch the db directly. */
export function partsRepository(db: Database.Database) {
  const assertPartType = (id: string) => {
    if (!db.prepare("SELECT 1 FROM part_types WHERE id = ?").get(id)) {
      throw new DomainError(400, `Unknown part type "${id}"`);
    }
  };

  /**
   * Sets each listed attribute (validated against its definition); null or
   * "" clears it. Any defined attribute is allowed, even one the part's type
   * doesn't show, so switching type back and forth keeps values.
   */
  const setAttributes = (
    code: string,
    values: Record<string, AttributeValue | null>,
  ) => {
    const defs = new Map(
      db
        .prepare<[], { id: number; key: string; label: string; data_type: AttributeDef["dataType"]; options: string | null }>(
          "SELECT id, key, label, data_type, options FROM attribute_defs",
        )
        .all()
        .map((d) => [d.key, d]),
    );
    const upsert = db.prepare(
      `INSERT INTO part_attributes (part_code, attribute_id, value) VALUES (?, ?, ?)
       ON CONFLICT (part_code, attribute_id) DO UPDATE SET value = excluded.value`,
    );
    const remove = db.prepare(
      "DELETE FROM part_attributes WHERE part_code = ? AND attribute_id = ?",
    );
    for (const [key, raw] of Object.entries(values)) {
      const def = defs.get(key);
      if (!def) throw new DomainError(400, `Unknown attribute "${key}"`);
      if (raw == null || String(raw).trim() === "") {
        remove.run(code, def.id);
        continue;
      }
      const parsed = parseAttributeValue(
        { dataType: def.data_type, options: def.options ? (JSON.parse(def.options) as string[]) : null },
        raw,
      );
      if (!parsed.ok) throw new DomainError(400, `${def.label}: ${parsed.error}`);
      upsert.run(code, def.id, String(parsed.value));
    }
  };

  return {
    listParts(q?: string): Part[] {
      const attributes = foldAttributes(
        db.prepare<[], AttributeRow>(SELECT_ATTRIBUTES).all(),
      );
      const withAttributes = (row: PartRow) => toPart(row, attributes.get(row.code));
      if (!q) {
        return db
          .prepare<[], PartRow>("SELECT * FROM parts ORDER BY code")
          .all()
          .map(withAttributes);
      }
      // Matches the part, any attribute value, or any grouping above it
      // (e.g. "Tracks").
      const like = `%${q}%`;
      return db
        .prepare<{ like: string }, PartRow>(
          `SELECT p.* FROM parts p
             JOIN groupings g ON g.id = p.group_id
             LEFT JOIN groupings s ON s.id = g.parent_id
            WHERE p.code LIKE @like OR p.name LIKE @like OR p.notes LIKE @like
               OR g.name LIKE @like OR s.name LIKE @like
               OR EXISTS (SELECT 1 FROM part_attributes pa
                           WHERE pa.part_code = p.code AND pa.value LIKE @like)
            ORDER BY p.code`,
        )
        .all({ like })
        .map(withAttributes);
    },

    getPart(code: string): Part | null {
      const row = db
        .prepare<[string], PartRow>("SELECT * FROM parts WHERE code = ?")
        .get(code);
      if (!row) return null;
      const attributes = foldAttributes(
        db
          .prepare<[string], AttributeRow>(`${SELECT_ATTRIBUTES} WHERE pa.part_code = ?`)
          .all(code),
      );
      return toPart(row, attributes.get(code));
    },

    updatePart(code: string, update: PartUpdate): Part | null {
      if (!this.getPart(code)) return null;
      const { attributes, ...core } = update;
      if (core.partTypeId !== undefined) assertPartType(core.partTypeId);
      const entries = Object.entries(core).filter(
        ([, value]) => value !== undefined,
      ) as [Exclude<keyof PartUpdate, "attributes">, unknown][];
      db.transaction(() => {
        if (attributes) setAttributes(code, attributes);
        const sets = entries
          .map(([key]) => `${partUpdateColumns[key]} = @${key}, `)
          .join("");
        db.prepare(
          `UPDATE parts SET ${sets}
             updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
           WHERE code = @code`,
        ).run({ ...Object.fromEntries(entries), code });
      })();
      return this.getPart(code);
    },

    /** A part added in the app (not from the CSV index). */
    createPart(input: PartCreate): Part {
      const group = db
        .prepare<[string], GroupingRow>("SELECT * FROM groupings WHERE id = ?")
        .get(input.groupId);
      if (group?.taxonomy !== "group") {
        throw new DomainError(400, `Unknown parts group "${input.groupId}"`);
      }
      assertPartType(input.partTypeId);
      const code = `${input.groupId}-${input.revision}${input.part}`;
      if (this.getPart(code)) throw new DomainError(409, `${code} already exists`);
      db.transaction(() => {
        db.prepare(
          `INSERT INTO parts (code, group_id, part, revision, name, part_type_id,
                              qty_per_build, notes, source)
           VALUES (@code, @groupId, @part, @revision, @name, @partTypeId,
                   @qtyPerBuild, @notes, 'app')`,
        ).run({ ...input, notes: input.notes ?? null, code });
        if (input.attributes) setAttributes(code, input.attributes);
      })();
      return this.getPart(code)!;
    },

    /** Next unused part number in a group ("01".."99"), or null when full. */
    nextPartNumber(groupId: string): string | null {
      const { max } = db
        .prepare<[string], { max: number | null }>(
          "SELECT MAX(CAST(part AS INTEGER)) AS max FROM parts WHERE group_id = ?",
        )
        .get(groupId)!;
      const next = (max ?? 0) + 1;
      return next > 99 ? null : String(next).padStart(2, "0");
    },

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
      const row = db
        .prepare<[string], GroupingRow>("SELECT * FROM groupings WHERE id = ?")
        .get(id);
      return row ? toGrouping(row) : null;
    },

    upsertGrouping(g: Grouping): void {
      db.prepare(
        `INSERT INTO groupings (id, taxonomy, name, revision, parent_id)
         VALUES (@id, @taxonomy, @name, @revision, @parentId)
         ON CONFLICT (id) DO UPDATE SET
           taxonomy = excluded.taxonomy, name = excluded.name,
           parent_id = excluded.parent_id`,
      ).run(g);
    },

    /**
     * Import upsert: catalog columns and the attributes passed only, so stock
     * and print data survive. The part's type is only set when passed.
     */
    upsertCatalogPart(
      p: Pick<
        Part,
        "code" | "groupId" | "part" | "revision" | "name" | "qtyPerBuild" | "notes" | "source"
      > & { partTypeId?: string; attributes: Record<string, AttributeValue | null> },
    ): void {
      const { attributes, partTypeId, ...core } = p;
      db.transaction(() => {
        if (partTypeId) assertPartType(partTypeId);
        db.prepare(
          `INSERT INTO parts (code, group_id, part, revision, name, qty_per_build,
                              notes, source, part_type_id)
           VALUES (@code, @groupId, @part, @revision, @name, @qtyPerBuild,
                   @notes, @source, COALESCE(@partTypeId, 'printed'))
           ON CONFLICT (code) DO UPDATE SET
             group_id = excluded.group_id, part = excluded.part,
             revision = excluded.revision, name = excluded.name,
             qty_per_build = excluded.qty_per_build,
             notes = excluded.notes, source = excluded.source,
             part_type_id = COALESCE(@partTypeId, part_type_id),
             updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')`,
        ).run({ ...core, partTypeId: partTypeId ?? null });
        setAttributes(p.code, attributes);
      })();
    },
  };
}

export type PartsRepository = ReturnType<typeof partsRepository>;
