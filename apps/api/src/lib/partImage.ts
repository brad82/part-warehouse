import { createHash } from "node:crypto";
import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import path from "node:path";
import type { PartImagesRepository } from "@parts-warehouse/db";
import {
  ImageScraperError,
  type ImageScraper,
} from "@parts-warehouse/image-scraper-proto";
import sharp from "sharp";

/** Largest upload accepted. */
export const MAX_UPLOAD_BYTES = 15 * 1024 * 1024;

/** Side of the stored square, px. Label renders are 600, so this has headroom. */
export const PART_IMAGE_SIZE = 1024;

/**
 * Centre-crops any image to a white-backed square JPEG, the same shape as
 * the STL viewer's label render. Throws if the bytes aren't a readable image.
 */
export function normaliseImage(input: Buffer): Promise<Buffer> {
  return sharp(input, { failOn: "error" })
    .rotate() // honour EXIF orientation
    .resize(PART_IMAGE_SIZE, PART_IMAGE_SIZE, {
      fit: "cover",
      position: "centre",
    })
    .flatten({ background: "#ffffff" })
    .jpeg({ quality: 88 })
    .toBuffer();
}

/**
 * Files in the part images folder. Names are a hash of the part code plus
 * a timestamp, so they're always safe paths and change with every image.
 */
export function partImageStore(dir: string) {
  return {
    path: (file: string) => path.join(dir, path.basename(file)),

    write(code: string, data: Buffer): string {
      mkdirSync(dir, { recursive: true });
      const hash = createHash("sha1").update(code).digest("hex").slice(0, 16);
      const file = `${hash}-${Date.now()}.jpg`;
      writeFileSync(path.join(dir, file), data);
      return file;
    },

    remove(file: string) {
      rmSync(path.join(dir, path.basename(file)), { force: true });
    },
  };
}

/** The bytes aren't an image sharp can decode. */
export class UnreadableImageError extends Error {
  constructor() {
    super("That file isn't an image we can read");
  }
}

/** None of the scraped URLs gave a usable image; the message says why. */
export class NoUsableImageError extends Error {}

type ImageMeta = {
  source: "upload" | "scrape";
  sourceUrl: string | null;
  candidates: string[];
};

/**
 * Stores, replaces and removes part images: the file in the folder and its
 * row in the db, kept in step. Knows nothing about HTTP.
 */
export function partImageService(images: PartImagesRepository, dir: string) {
  const store = partImageStore(dir);

  /** Normalises and stores `data` as the part's image, replacing any old one. */
  async function save(code: string, data: Buffer, meta: ImageMeta) {
    let jpeg: Buffer;
    try {
      jpeg = await normaliseImage(data);
    } catch {
      throw new UnreadableImageError();
    }
    const previous = images.get(code);
    images.set(code, { ...meta, file: store.write(code, jpeg) });
    if (previous) store.remove(previous.file);
  }

  return {
    /** Absolute path of the part's image file, or null without one. */
    file(code: string): string | null {
      const image = images.get(code);
      return image ? store.path(image.file) : null;
    },

    upload: (code: string, data: Buffer) =>
      save(code, data, { source: "upload", sourceUrl: null, candidates: [] }),

    /**
     * Saves the first of `urls` that downloads and decodes. A scraper that's
     * down fails at once; anything else moves on to the next URL.
     */
    async saveFirstScraped(
      scraper: ImageScraper,
      code: string,
      urls: string[],
      candidates: string[],
    ) {
      let lastError =
        "No images found on the supplier page (some sites block automated requests). Upload one instead.";
      for (const url of urls) {
        try {
          const { data } = await scraper.fetchImage(url);
          return await save(code, data, {
            source: "scrape",
            sourceUrl: url,
            candidates,
          });
        } catch (err) {
          if (err instanceof ImageScraperError && err.code === "unavailable")
            throw err;
          if (!(
            err instanceof ImageScraperError ||
            err instanceof UnreadableImageError
          ))
            throw err;
          lastError = err.message;
        }
      }
      throw new NoUsableImageError(lastError);
    },

    /** The part's scraped candidates, so a pick can be checked against them. */
    candidates: (code: string) => images.get(code)?.candidates ?? [],

    remove(code: string) {
      const image = images.get(code);
      if (!image) return;
      images.delete(code);
      store.remove(image.file);
    },
  };
}
