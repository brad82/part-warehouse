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
import type {
  PartImagesRepository,
  PartsRepository,
} from "@parts-warehouse/db";
import {
  ImageScraperError,
  type ImageScraper,
} from "@parts-warehouse/image-scraper-proto";
import { config } from "../config.js";
import {
  MAX_UPLOAD_BYTES,
  NoUsableImageError,
  partImageService,
  UnreadableImageError,
} from "../lib/partImage.js";

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
  { repo, images, partImagesDir = config.partImagesDir, scraper = null },
) => {
  await app.register(multipart, {
    limits: { fileSize: MAX_UPLOAD_BYTES, files: 1 },
  });
  const service = partImageService(images, partImagesDir);
  const { httpErrors } = app;

  const partOr404 = (code: string) => {
    const part = repo.getPart(code);
    if (!part) throw httpErrors.notFound("Part not found");
    return part;
  };

  const requireScraper = () => {
    if (!scraper)
      throw httpErrors.notImplemented("Image scraping isn't installed");
    return scraper;
  };

  /**
   * The service's errors as HTTP: a bad image is a 400, the site's refusal a
   * 422 the user can read, a missing scraper a 503.
   */
  const toHttpError = (err: unknown) => {
    if (err instanceof UnreadableImageError)
      return httpErrors.badRequest(err.message);
    if (err instanceof NoUsableImageError)
      return httpErrors.unprocessableEntity(err.message);
    if (err instanceof ImageScraperError) {
      if (err.code === "unavailable")
        return httpErrors.serviceUnavailable(err.message);
      if (err.code === "internal") return httpErrors.badGateway(err.message);
      return httpErrors.unprocessableEntity(err.message);
    }
    return err;
  };

  /** Runs a service call and answers with the updated part. */
  const thenPart = async (code: string, work: Promise<unknown>) => {
    try {
      await work;
    } catch (err) {
      throw toHttpError(err);
    }
    return repo.getPart(code)!;
  };

  app.get(
    "/parts/:code/image",
    {
      schema: {
        params: partCodeParamsSchema,
        querystring: z.object({ v: z.string().optional() }),
      },
    },
    async (request, reply) => {
      const file = service.file(request.params.code);
      if (!file || !existsSync(file))
        throw httpErrors.notFound("Part has no image");
      // The web app adds ?v=<updatedAt>, so that URL's bytes never change.
      const versioned = request.query.v !== undefined;
      reply
        .header("content-type", "image/jpeg")
        .header(
          "cache-control",
          versioned ? "public, max-age=31536000, immutable" : "no-cache",
        );
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
      return thenPart(code, service.upload(code, await upload.toBuffer()));
    },
  );

  app.post(
    "/parts/:code/image/scrape",
    { schema: { params: partCodeParamsSchema } },
    async (request) => {
      const { code } = request.params;
      const scraper = requireScraper();
      const pageUrl = attrText(partOr404(code), ATTR.supplierUrl);
      if (!pageUrl)
        throw httpErrors.unprocessableEntity("Part has no supplier link");
      return thenPart(
        code,
        scraper
          .findImages(pageUrl)
          .then((candidates) =>
            service.saveFirstScraped(scraper, code, candidates, candidates),
          ),
      );
    },
  );

  app.post(
    "/parts/:code/image/select",
    { schema: { params: partCodeParamsSchema, body: partImageSelectSchema } },
    async (request) => {
      const { code } = request.params;
      const scraper = requireScraper();
      partOr404(code);
      const candidates = service.candidates(code);
      // Only URLs a scrape found, so this can't be used to fetch anything else.
      if (!candidates.includes(request.body.url)) {
        throw httpErrors.badRequest("Not one of the scraped images");
      }
      return thenPart(
        code,
        service.saveFirstScraped(scraper, code, [request.body.url], candidates),
      );
    },
  );

  app.delete(
    "/parts/:code/image",
    { schema: { params: partCodeParamsSchema } },
    async (request) => {
      const { code } = request.params;
      partOr404(code);
      service.remove(code);
      return repo.getPart(code)!;
    },
  );
};
