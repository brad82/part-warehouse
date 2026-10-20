import * as cheerio from "cheerio";
import { ImageScraperError, type FetchedImage } from "@parts-warehouse/image-scraper-proto";
import type { PageRenderer } from "./pageRenderer.js";

export type Fetch = typeof fetch;

const USER_AGENT =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 " +
  "(KHTML, like Gecko) Chrome/126.0 Safari/537.36";
const TIMEOUT_MS = 10_000;
export const MAX_PAGE_BYTES = 5 * 1024 * 1024;
export const MAX_IMAGE_BYTES = 15 * 1024 * 1024;

/** The site refused or failed, with a message fit to show the user. */
export class ScrapeError extends ImageScraperError {
  constructor(message: string) {
    super(message, "refused");
  }
}

const isHttp = (url: URL) => url.protocol === "http:" || url.protocol === "https:";

function absolute(raw: unknown, base: string): string | null {
  if (typeof raw !== "string" || !raw.trim()) return null;
  try {
    const url = new URL(raw.trim(), base);
    return isHttp(url) ? url.href : null;
  } catch {
    return null;
  }
}

/** `image` of a JSON-LD node: a URL, an ImageObject, or a list of either. */
function ldImages(value: unknown): unknown[] {
  if (Array.isArray(value)) return value.flatMap(ldImages);
  if (value && typeof value === "object") {
    const obj = value as Record<string, unknown>;
    return [obj.contentUrl ?? obj.url];
  }
  return [value];
}

const isProduct = (type: unknown) =>
  [type].flat().some((t) => typeof t === "string" && /(^|[/:])Product(Group)?$/.test(t));

/** Every Product node in a JSON-LD document (top level, arrays, @graph). */
function ldProducts(node: unknown): Record<string, unknown>[] {
  if (Array.isArray(node)) return node.flatMap(ldProducts);
  if (!node || typeof node !== "object") return [];
  const obj = node as Record<string, unknown>;
  return [
    ...(isProduct(obj["@type"]) ? [obj] : []),
    ...ldProducts(obj["@graph"]),
    ...ldProducts(obj.hasVariant),
  ];
}

/**
 * Image URLs a product page offers, best first: JSON-LD Product images
 * (usually clean product shots), then Open Graph, then Twitter cards.
 * Absolute http(s) URLs only, no duplicates.
 */
export function extractImageCandidates(html: string, pageUrl: string): string[] {
  const $ = cheerio.load(html);
  const found: unknown[] = [];

  $('script[type="application/ld+json"]').each((_, el) => {
    try {
      const doc: unknown = JSON.parse($(el).text());
      for (const product of ldProducts(doc)) found.push(...ldImages(product.image));
    } catch {
      // Malformed JSON-LD is common; skip that block.
    }
  });

  const meta = (name: string) =>
    $(`meta[property="${name}"], meta[name="${name}"]`)
      .map((_, el) => $(el).attr("content"))
      .get();
  found.push(
    ...meta("og:image:secure_url"),
    ...meta("og:image"),
    ...meta("og:image:url"),
    ...meta("twitter:image"),
    ...meta("twitter:image:src"),
  );

  const urls = found
    .map((raw) => absolute(raw, pageUrl))
    .filter((url): url is string => url !== null);
  return [...new Set(urls)];
}

function parseLink(url: string): URL {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    throw new ImageScraperError("That isn't a valid link", "invalid");
  }
  if (!isHttp(parsed)) throw new ImageScraperError("Only http(s) links can be fetched", "invalid");
  return parsed;
}

async function get(fetchFn: Fetch, url: string, accept: string): Promise<Response> {
  const parsed = parseLink(url);
  let res: Response;
  try {
    res = await fetchFn(parsed, {
      headers: { "user-agent": USER_AGENT, accept },
      redirect: "follow",
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
  } catch {
    throw new ScrapeError(`Couldn't reach ${parsed.host}`);
  }
  if (!res.ok) throw new ScrapeError(`${parsed.host} answered ${res.status}`);
  return res;
}

/** The body, refusing anything over `max` bytes. */
async function readCapped(res: Response, max: number): Promise<Buffer> {
  if (Number(res.headers.get("content-length") ?? 0) > max) {
    throw new ScrapeError("Response is too large");
  }
  const buf = Buffer.from(await res.arrayBuffer());
  if (buf.length > max) throw new ScrapeError("Response is too large");
  return buf;
}

async function fetchCandidates(fetchFn: Fetch, pageUrl: string) {
  const res = await get(fetchFn, pageUrl, "text/html,application/xhtml+xml");
  const html = (await readCapped(res, MAX_PAGE_BYTES)).toString("utf8");
  return extractImageCandidates(html, res.url || pageUrl);
}

/**
 * Lists a product page's image candidates. A plain fetch first (fast, and
 * enough for most shops); if that fails or finds nothing, and a browser is
 * available, the page is loaded in it so script-built pages and cookie
 * checks work too. The browser's error wins: it got further.
 */
export async function scrapeImageCandidates(
  fetchFn: Fetch,
  pageUrl: string,
  renderer?: PageRenderer | null,
): Promise<string[]> {
  let plainError: unknown = null;
  try {
    const found = await fetchCandidates(fetchFn, pageUrl);
    if (found.length || !renderer) return found;
  } catch (err) {
    if (!renderer) throw err;
    plainError = err;
  }
  try {
    const page = await renderer.render(pageUrl);
    return extractImageCandidates(page.html, page.url);
  } catch (err) {
    if (err instanceof ScrapeError || !plainError) throw err;
    throw plainError;
  }
}

/** Downloads an image, checking it is one. */
export async function fetchImage(fetchFn: Fetch, url: string): Promise<FetchedImage> {
  const res = await get(fetchFn, url, "image/*");
  const contentType = res.headers.get("content-type") ?? "";
  if (!contentType.startsWith("image/")) throw new ScrapeError("Link isn't an image");
  return { data: await readCapped(res, MAX_IMAGE_BYTES), contentType };
}
