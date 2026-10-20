import { createReadStream, existsSync } from "node:fs";
import multipart from "@fastify/multipart";
import type { FastifyPluginAsyncZod } from "fastify-type-provider-zod";
import { z } from "zod";
import {
  ATTR,
  attrText,
  partCodeParamsSchema,
  partImageSelectSchema,
} from "@parts-warehouse/shared";
import type { PartImagesRepository, PartsRepository } from "@parts-warehouse/db";
import { ImageScraperError, type ImageScraper } from "@parts-warehouse/image-scraper-proto";
import { config } from "../config.js";
import { MAX_UPLOAD_BYTES, normaliseImage, partImageStore } from "../lib/partImage.js";

type Options = {
  repo: PartsRepository;
  images: PartImagesRepository;
  partImagesDir?: string;
  /** The optional image-scraper app; without it only uploads work. */
  scraper?: ImageScraper | null;
};

/**
 * A part's preview image: uploaded, or scraped from its supplier link by
 * the image-scraper app. Each one is centre-cropped to a square JPEG before
 * it's stored. Write routes answer with the updated part.
 */
export const partImagesRoutes: FastifyPluginAsyncZod<Options> = async (
  app,
  {
    repo,
    images,
    partImagesDir = config.partImagesDir,
    scraper = null,
  },
) => {
  await app.register(multipart, { limits: { fileSize: MAX_UPLOAD_BYTES, files: 1 } });
  const store = partImageStore(partImagesDir);
  const { httpErrors } = app;

  const partOr404 = (code: string) => {
    const part = repo.getPart(code);
    if (!part) throw httpErrors.notFound("Part not found");
    return part;
  };

  const requireScraper = () => {
    if (!scraper) throw httpErrors.notImplemented("Image scraping isn't installed");
    return scraper;
  };

  /** The site's refusal is a 422 the user can read; a missing scraper a 503. */
  const scraperHttpError = (err: ImageScraperError) =>
    err.code === "unavailable"
      ? httpErrors.serviceUnavailable(err.message)
      : err.code === "internal"
        ? httpErrors.badGateway(err.message)
        : httpErrors.unprocessableEntity(err.message);

  /** Normalises and stores `data` as the part's image, replacing any old one. */
  async function save(
    code: string,
    data: Buffer,
    meta: { source: "upload" | "scrape"; sourceUrl: string | null; candidates: string[] },
  ) {
    let jpeg: Buffer;
    try {
      jpeg = await normaliseImage(data);
    } catch {
      throw httpErrors.badRequest("That file isn't an image we can read");
    }
    const previous = images.get(code);
    images.set(code, { ...meta, file: store.write(code, jpeg) });
    if (previous) store.remove(previous.file);
    return repo.getPart(code)!;
  }

  /** The first candidate that downloads and decodes. */
  async function saveFirstWorking(
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
        return await save(code, data, { source: "scrape", sourceUrl: url, candidates });
      } catch (err) {
        // The scraper itself is down: no point trying the rest.
        if (err instanceof ImageScraperError && err.code === "unavailable") {
          throw scraperHttpError(err);
        }
        // Unreachable or unreadable: try the next one.
        const skippable =
          err instanceof ImageScraperError || (err instanceof Error && "statusCode" in err);
        if (!skippable) throw err;
        lastError = err.message;
      }
    }
    throw httpErrors.unprocessableEntity(lastError);
  }

  app.get(
    "/parts/:code/image",
    { schema: { params: partCodeParamsSchema, querystring: z.object({ v: z.string().optional() }) } },
    async (request, reply) => {
      const image = images.get(request.params.code);
      const file = image && store.path(image.file);
      if (!file || !existsSync(file)) throw httpErrors.notFound("Part has no image");
      // The web app adds ?v=<updatedAt>, so that URL's bytes never change.
      const versioned = request.query.v !== undefined;
      reply
        .header("content-type", "image/jpeg")
        .header("cache-control", versioned ? "public, max-age=31536000, immutable" : "no-cache");
      return reply.send(createReadStream(file));
    },
  );

  app.put(
    "/parts/:code/image",
    { schema: { params: partCodeParamsSchema } },
    async (request) => {
      const { code } = request.params;
      partOr404(code);
      const upload = await request.file();
      if (!upload) throw httpErrors.badRequest("No file uploaded");
      const data = await upload.toBuffer();
      return save(code, data, { source: "upload", sourceUrl: null, candidates: [] });
    },
  );

  app.post(
    "/parts/:code/image/scrape",
    { schema: { params: partCodeParamsSchema } },
    async (request) => {
      const { code } = request.params;
      const scraper = requireScraper();
      const pageUrl = attrText(partOr404(code), ATTR.supplierUrl);
      if (!pageUrl) throw httpErrors.unprocessableEntity("Part has no supplier link");
      let candidates: string[];
      try {
        candidates = await scraper.findImages(pageUrl);
      } catch (err) {
        if (err instanceof ImageScraperError) throw scraperHttpError(err);
        throw err;
      }
      return saveFirstWorking(scraper, code, candidates, candidates);
    },
  );

  app.post(
    "/parts/:code/image/select",
    { schema: { params: partCodeParamsSchema, body: partImageSelectSchema } },
    async (request) => {
      const { code } = request.params;
      const scraper = requireScraper();
      partOr404(code);
      const candidates = images.get(code)?.candidates ?? [];
      // Only URLs a scrape found, so this can't be used to fetch anything else.
      if (!candidates.includes(request.body.url)) {
        throw httpErrors.badRequest("Not one of the scraped images");
      }
      return saveFirstWorking(scraper, code, [request.body.url], candidates);
    },
  );

  app.delete(
    "/parts/:code/image",
    { schema: { params: partCodeParamsSchema } },
    async (request) => {
      const { code } = request.params;
      partOr404(code);
      const image = images.get(code);
      if (image) {
        images.delete(code);
        store.remove(image.file);
      }
      return repo.getPart(code)!;
    },
  );
};
