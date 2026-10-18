import type Database from "better-sqlite3";
import type {
  LabelElement,
  LabelTemplate,
  LabelTemplateInput,
} from "@snowcat/shared";
import { DomainError } from "../errors.js";

type Row = {
  id: string;
  name: string;
  description: string | null;
  width_mm: number;
  height_mm: number;
  elements: string;
  builtin: number;
  updated_at: string;
};

const SELECT =
  "SELECT id, name, description, width_mm, height_mm, elements, builtin, updated_at FROM label_templates";

const toTemplate = (row: Row): LabelTemplate => ({
  id: row.id,
  name: row.name,
  description: row.description,
  widthMm: row.width_mm,
  heightMm: row.height_mm,
  elements: JSON.parse(row.elements) as LabelElement[],
  builtin: row.builtin === 1,
  updatedAt: row.updated_at,
});

/** "Bag label (v2)" → "bag-label-v2". */
const slugify = (name: string) =>
  name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "") || "template";

/** Label templates, edited in the label editor and printed by web and CLI. */
export function labelTemplatesRepository(db: Database.Database) {
  const assertNameFree = (name: string, exceptId?: string) => {
    const row = db
      .prepare<[string], { id: string }>(
        "SELECT id FROM label_templates WHERE name = ?",
      )
      .get(name);
    if (row && row.id !== exceptId) {
      throw new DomainError(409, `A template named "${name}" already exists`);
    }
  };

  /** A slug of `name` not yet used as an id ("bag-label", "bag-label-2"…). */
  const freeId = (name: string) => {
    const base = slugify(name);
    const taken = new Set(
      db
        .prepare<[string, string], { id: string }>(
          "SELECT id FROM label_templates WHERE id = ? OR id LIKE ?",
        )
        .all(base, `${base}-%`)
        .map((r) => r.id),
    );
    let id = base;
    for (let n = 2; taken.has(id); n++) id = `${base}-${n}`;
    return id;
  };

  const params = (input: LabelTemplateInput) => ({
    name: input.name,
    description: input.description,
    width_mm: input.widthMm,
    height_mm: input.heightMm,
    elements: JSON.stringify(input.elements),
  });

  const repo = {
    /** Built-ins first, then by name. */
    list(): LabelTemplate[] {
      return db
        .prepare<[], Row>(
          `${SELECT} ORDER BY builtin DESC, name COLLATE NOCASE`,
        )
        .all()
        .map(toTemplate);
    },

    get(id: string): LabelTemplate | null {
      const row = db.prepare<[string], Row>(`${SELECT} WHERE id = ?`).get(id);
      return row ? toTemplate(row) : null;
    },

    /** Stores a new template under an id made from its name. */
    create(input: LabelTemplateInput): LabelTemplate {
      assertNameFree(input.name);
      const id = freeId(input.name);
      db.prepare(
        `INSERT INTO label_templates (id, name, description, width_mm, height_mm, elements)
         VALUES (@id, @name, @description, @width_mm, @height_mm, @elements)`,
      ).run({ id, ...params(input) });
      return repo.get(id)!;
    },

    /** Replaces a template's content; null when there's no such template. */
    update(id: string, input: LabelTemplateInput): LabelTemplate | null {
      assertNameFree(input.name, id);
      db.prepare(
        `UPDATE label_templates
            SET name = @name, description = @description, width_mm = @width_mm,
                height_mm = @height_mm, elements = @elements,
                updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
          WHERE id = @id`,
      ).run({ id, ...params(input) });
      return repo.get(id);
    },

    /** False when there's no such template; built-ins can't be deleted. */
    delete(id: string): boolean {
      if (repo.get(id)?.builtin) {
        throw new DomainError(409, "Built-in templates can't be deleted");
      }
      return (
        db.prepare("DELETE FROM label_templates WHERE id = ?").run(id).changes >
        0
      );
    },

    /**
     * Inserts built-in templates that aren't stored yet. Existing ones are
     * left alone, so edits made in the editor survive restarts.
     */
    ensureBuiltins(templates: (LabelTemplateInput & { id: string })[]) {
      const insert = db.prepare(
        `INSERT OR IGNORE INTO label_templates
           (id, name, description, width_mm, height_mm, elements, builtin)
         VALUES (@id, @name, @description, @width_mm, @height_mm, @elements, 1)`,
      );
      db.transaction(() => {
        for (const t of templates) insert.run({ id: t.id, ...params(t) });
      })();
    },
  };
  return repo;
}

export type LabelTemplatesRepository = ReturnType<
  typeof labelTemplatesRepository
>;
