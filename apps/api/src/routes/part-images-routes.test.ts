import { existsSync, mkdtempSync, readdirSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import sharp from "sharp";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { openDb, partsRepository } from "@parts-warehouse/db";
import { ImageScraperError, type ImageScraper } from "@parts-warehouse/image-scraper-proto";
import { buildServer } from "../app.js";

const CODE = "A01-001-001";
const PAGE = "https://shop.example.com/bolt";
const IMG_A = "https://cdn.example.com/a.png";
const IMG_B = "https://cdn.example.com/b.png";
const BROKEN = "https://cdn.example.com/broken.png";

let app: Awaited<ReturnType<typeof buildServer>>;
let imagesDir: string;
let wide: Buffer;
let fetched: string[];

const gone = (url: string) => new ImageScraperError(`${new URL(url).host} answered 404`);

/** A product page listing BROKEN, A and B, where only A and B download. */
const fakeScraper: ImageScraper = {
  async findImages(url) {
    fetched.push(url);
    if (url !== PAGE) throw gone(url);
    return [BROKEN, IMG_A, IMG_B];
  },
  async fetchImage(url) {
    fetched.push(url);
    if (url !== IMG_A && url !== IMG_B) throw gone(url);
    return { data: wide, contentType: "image/png" };
  },
};

/** A db with one purchased part whose supplier link is PAGE. */
function seededDb() {
  const db = openDb(":memory:");
  const repo = partsRepository(db);
  repo.upsertGrouping({ id: "A", taxonomy: "module", name: "Chassis", revision: 0, parentId: null });
  repo.upsertGrouping({ id: "A01", taxonomy: "subassembly", name: "Tracks", revision: 0, parentId: "A" });
  repo.upsertGrouping({ id: "A01-001", taxonomy: "group", name: "Grousers", revision: 0, parentId: "A01" });
  repo.upsertCatalogPart({
    code: CODE, groupId: "A01-001", part: "01", revision: 0, qtyPerBuild: 1,
    notes: null, source: "csv", name: "Bolt", partTypeId: "purchased",
    attributes: { supplier_url: PAGE },
  });
  return db;
}

function multipartBody(data: Buffer, filename = "photo.png") {
  const boundary = "----test-boundary";
  const body = Buffer.concat([
    Buffer.from(
      `--${boundary}\r\nContent-Disposition: form-data; name="file"; filename="${filename}"\r\n` +
        "Content-Type: image/png\r\n\r\n",
    ),
    data,
    Buffer.from(`\r\n--${boundary}--\r\n`),
  ]);
  return { payload: body, headers: { "content-type": `multipart/form-data; boundary=${boundary}` } };
}

beforeEach(async () => {
  wide = await sharp({
    create: { width: 400, height: 200, channels: 4, background: { r: 255, g: 0, b: 0, alpha: 0.5 } },
  })
    .png()
    .toBuffer();
  imagesDir = mkdtempSync(path.join(os.tmpdir(), "part-images-"));
  fetched = [];
  const db = seededDb();
  app = await buildServer({ db, partImagesDir: imagesDir, scraper: fakeScraper, logger: false });
});

afterEach(() => app.close());

describe("part image routes", () => {
  it("starts without an image", async () => {
    expect((await app.inject(`/parts/${CODE}`)).json().image).toBeNull();
    expect((await app.inject(`/parts/${CODE}/image`)).statusCode).toBe(404);
  });

  it("stores an upload as a centre-cropped square JPEG", async () => {
    const res = await app.inject({ method: "PUT", url: `/parts/${CODE}/image`, ...multipartBody(wide) });
    expect(res.statusCode).toBe(200);
    expect(res.json().image).toMatchObject({ source: "upload", sourceUrl: null, candidates: [] });

    const img = await app.inject(`/parts/${CODE}/image`);
    expect(img.headers["content-type"]).toBe("image/jpeg");
    const meta = await sharp(img.rawPayload).metadata();
    expect(meta).toMatchObject({ format: "jpeg", width: 1024, height: 1024 });
  });

  it("rejects an upload that isn't an image", async () => {
    const res = await app.inject({
      method: "PUT",
      url: `/parts/${CODE}/image`,
      ...multipartBody(Buffer.from("not an image")),
    });
    expect(res.statusCode).toBe(400);
  });

  it("scrapes the supplier link, skipping images that don't load", async () => {
    const res = await app.inject({ method: "POST", url: `/parts/${CODE}/image/scrape` });
    expect(res.statusCode).toBe(200);
    expect(res.json().image).toMatchObject({
      source: "scrape",
      sourceUrl: IMG_A,
      candidates: [BROKEN, IMG_A, IMG_B],
    });
    expect(fetched).toEqual([PAGE, BROKEN, IMG_A]);
  });

  it("swaps to another scraped image and removes the old file", async () => {
    await app.inject({ method: "POST", url: `/parts/${CODE}/image/scrape` });
    const res = await app.inject({
      method: "POST",
      url: `/parts/${CODE}/image/select`,
      payload: { url: IMG_B },
    });
    expect(res.json().image).toMatchObject({ sourceUrl: IMG_B, candidates: [BROKEN, IMG_A, IMG_B] });
    expect(readdirSync(imagesDir)).toHaveLength(1);
  });

  it("only fetches URLs the scrape found", async () => {
    await app.inject({ method: "POST", url: `/parts/${CODE}/image/scrape` });
    const res = await app.inject({
      method: "POST",
      url: `/parts/${CODE}/image/select`,
      payload: { url: "http://127.0.0.1/secret.png" },
    });
    expect(res.statusCode).toBe(400);
    expect(fetched).not.toContain("http://127.0.0.1/secret.png");
  });

  it("explains when the supplier page has nothing usable", async () => {
    await app.inject({
      method: "PATCH",
      url: `/parts/${CODE}`,
      payload: { attributes: { supplier_url: "https://shop.example.com/missing" } },
    });
    const res = await app.inject({ method: "POST", url: `/parts/${CODE}/image/scrape` });
    expect(res.statusCode).toBe(422);
    expect(res.json().message).toBe("shop.example.com answered 404");
  });

  it("deletes the image and its file", async () => {
    await app.inject({ method: "PUT", url: `/parts/${CODE}/image`, ...multipartBody(wide) });
    const [file] = readdirSync(imagesDir);
    const res = await app.inject({ method: "DELETE", url: `/parts/${CODE}/image` });
    expect(res.json().image).toBeNull();
    expect(existsSync(path.join(imagesDir, file!))).toBe(false);
  });

  it("reports scraping as off without the image-scraper app", async () => {
    await app.close();
    const db = openDb(":memory:");
    app = await buildServer({ db, partImagesDir: imagesDir, logger: false });
    expect((await app.inject("/capabilities")).json()).toEqual({ imageScraper: false });
    const res = await app.inject({ method: "POST", url: `/parts/${CODE}/image/scrape` });
    expect(res.statusCode).toBe(501);
  });

  it("answers 503 when the image-scraper app is down", async () => {
    await app.close();
    const down = new ImageScraperError("The image scraper isn't running.", "unavailable");
    const db = seededDb();
    const scraper: ImageScraper = {
      findImages: async () => Promise.reject(down),
      fetchImage: async () => Promise.reject(down),
    };
    app = await buildServer({ db, partImagesDir: imagesDir, scraper, logger: false });
    expect((await app.inject("/capabilities")).json()).toEqual({ imageScraper: true });
    const res = await app.inject({ method: "POST", url: `/parts/${CODE}/image/scrape` });
    expect(res.statusCode).toBe(503);
    expect(res.json().message).toBe("The image scraper isn't running.");
  });
});
