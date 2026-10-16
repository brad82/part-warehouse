import type Database from "better-sqlite3";
import type {
  PreviewColour,
  PreviewColourCreate,
  PreviewColourUpdate,
} from "@snowcat/shared";
import { DomainError } from "../errors.js";

const SELECT = "SELECT id, name, hex, sort FROM preview_colours";

/** Colours the STL viewer offers (Settings → STL Preview). */
export function previewColoursRepository(db: Database.Database) {
  const assertNameFree = (name: string, exceptId?: number) => {
    const row = db
      .prepare<[string], { id: number }>("SELECT id FROM preview_colours WHERE name = ?")
      .get(name);
    if (row && row.id !== exceptId) {
      throw new DomainError(409, `A colour named "${name}" already exists`);
    }
  };

  const repo = {
    list(): PreviewColour[] {
      return db.prepare<[], PreviewColour>(`${SELECT} ORDER BY sort, name`).all();
    },

    get(id: number): PreviewColour | null {
      return db.prepare<[number], PreviewColour>(`${SELECT} WHERE id = ?`).get(id) ?? null;
    },

    create(input: PreviewColourCreate): PreviewColour {
      assertNameFree(input.name);
      const sort =
        input.sort ??
        db
          .prepare<[], { s: number }>("SELECT COALESCE(MAX(sort), 0) + 10 AS s FROM preview_colours")
          .get()!.s;
      const { lastInsertRowid } = db
        .prepare("INSERT INTO preview_colours (name, hex, sort) VALUES (?, ?, ?)")
        .run(input.name, input.hex, sort);
      return repo.get(Number(lastInsertRowid))!;
    },

    update(id: number, update: PreviewColourUpdate): PreviewColour | null {
      if (update.name !== undefined) assertNameFree(update.name, id);
      db.prepare(
        `UPDATE preview_colours
            SET name = COALESCE(@name, name), hex = COALESCE(@hex, hex),
                sort = COALESCE(@sort, sort)
          WHERE id = @id`,
      ).run({ id, name: update.name ?? null, hex: update.hex ?? null, sort: update.sort ?? null });
      return repo.get(id);
    },

    delete(id: number): boolean {
      return db.prepare("DELETE FROM preview_colours WHERE id = ?").run(id).changes > 0;
    },
  };
  return repo;
}

export type PreviewColoursRepository = ReturnType<typeof previewColoursRepository>;
