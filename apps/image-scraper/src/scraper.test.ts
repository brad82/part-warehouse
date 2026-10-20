import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  createImageScraperClient,
  ImageScraperError,
  serveImageScraper,
} from "@parts-warehouse/image-scraper-proto";
import type { Fetch } from "./lib/scrapeImages.js";
import { createScraper } from "./scraper.js";

const PAGE = "https://shop.example.com/bolt";
// Bigger than gRPC's 4 MB default message size.
const BIG = Buffer.alloc(6 * 1024 * 1024, 7);

const fakeFetch: Fetch = async (input) => {
  const url = String(input);
  if (url === PAGE) {
    return new Response('<meta property="og:image" content="/big.png">', {
      headers: { "content-type": "text/html" },
    });
  }
  if (url === "https://shop.example.com/big.png") {
    return new Response(new Uint8Array(BIG), { headers: { "content-type": "image/png" } });
  }
  return new Response("gone", { status: 404 });
};

let client: ReturnType<typeof createImageScraperClient>;
let stop: () => void;

beforeAll(async () => {
  const { port, server } = await serveImageScraper(
    createScraper({ fetch: fakeFetch }),
    "127.0.0.1:0",
  );
  client = createImageScraperClient(`127.0.0.1:${port}`);
  stop = () => server.forceShutdown();
});

afterAll(() => {
  client.close();
  stop();
});

describe("image scraper over gRPC", () => {
  it("finds a page's images", async () => {
    expect(await client.findImages(PAGE)).toEqual(["https://shop.example.com/big.png"]);
  });

  it("downloads an image larger than the gRPC default limit", async () => {
    const image = await client.fetchImage("https://shop.example.com/big.png");
    expect(image.contentType).toBe("image/png");
    expect(image.data.equals(BIG)).toBe(true);
  });

  it("passes a refusal through with its message", async () => {
    const err = await client.findImages("https://shop.example.com/missing").catch((e) => e);
    expect(err).toBeInstanceOf(ImageScraperError);
    expect(err).toMatchObject({ code: "refused", message: "shop.example.com answered 404" });
  });

  it("rejects links that aren't http(s)", async () => {
    await expect(client.findImages("file:///etc/passwd")).rejects.toMatchObject({ code: "invalid" });
  });

  it("reports an unreachable scraper as unavailable", async () => {
    const nobody = createImageScraperClient("127.0.0.1:1", { findDeadlineMs: 2000 });
    await expect(nobody.findImages(PAGE)).rejects.toMatchObject({ code: "unavailable" });
    nobody.close();
  });
});
