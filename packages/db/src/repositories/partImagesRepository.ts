import type Database from "better-sqlite3";
import type { PartImage } from "@parts-warehouse/shared";

export type PartImageRow = {
  part_code: string;
  file: string;
  source: PartImage["source"];
  source_url: string | null;
  candidates: string | null;
  updated_at: string;
};

export function toPartImage(row: PartImageRow): PartImage {
  return {
    source: row.source,
    sourceUrl: row.source_url,
    candidates: row.candidates ? (JSON.parse(row.candidates) as string[]) : [],
    updatedAt: row.updated_at,
  };
}

export type PartImageRecord = PartImage & { file: string };

/** Which image file belongs to which part. The files themselves are the API's. */
export function partImagesRepository(db: Database.Database) {
  return {
    get(code: string): PartImageRecord | null {
      const row = db
        .prepare<[string], PartImageRow>("SELECT * FROM part_images WHERE part_code = ?")
        .get(code);
      return row ? { ...toPartImage(row), file: row.file } : null;
    },

    set(
      code: string,
      image: Pick<PartImageRecord, "file" | "source" | "sourceUrl" | "candidates">,
    ): PartImageRecord {
      db.prepare(
        `INSERT INTO part_images (part_code, file, source, source_url, candidates)
         VALUES (@code, @file, @source, @sourceUrl, @candidates)
         ON CONFLICT (part_code) DO UPDATE SET
           file = excluded.file, source = excluded.source,
           source_url = excluded.source_url, candidates = excluded.candidates,
           updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')`,
      ).run({
        code,
        file: image.file,
        source: image.source,
        sourceUrl: image.sourceUrl,
        candidates: image.candidates.length ? JSON.stringify(image.candidates) : null,
      });
      return this.get(code)!;
    },

    delete(code: string): boolean {
      return db.prepare("DELETE FROM part_images WHERE part_code = ?").run(code).changes > 0;
    },
  };
}

export type PartImagesRepository = ReturnType<typeof partImagesRepository>;
