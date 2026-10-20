import { createHash } from "node:crypto";
import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import path from "node:path";
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
    .resize(PART_IMAGE_SIZE, PART_IMAGE_SIZE, { fit: "cover", position: "centre" })
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
