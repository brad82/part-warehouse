import { describe, expect, it, vi } from "vitest";
import type { PageRenderer } from "./pageRenderer.js";
import {
  extractImageCandidates,
  scrapeImageCandidates,
  ScrapeError,
  type Fetch,
} from "./scrapeImages.js";

const page = "https://shop.example.com/products/bolt?variant=1";
const ld = (doc: unknown) =>
  `<script type="application/ld+json">${JSON.stringify(doc)}</script>`;

describe("extractImageCandidates", () => {
  it("reads Open Graph and Twitter images", () => {
    const html = `<head>
      <meta property="og:image" content="https://cdn.example.com/og.jpg">
      <meta name="twitter:image" content="https://cdn.example.com/tw.jpg">
    </head>`;
    expect(extractImageCandidates(html, page)).toEqual([
      "https://cdn.example.com/og.jpg",
      "https://cdn.example.com/tw.jpg",
    ]);
  });

  it("puts JSON-LD product images first, in order", () => {
    const html = `
      <meta property="og:image" content="https://cdn.example.com/og.jpg">
      ${ld({ "@type": "Product", image: ["https://cdn.example.com/a.jpg", "https://cdn.example.com/b.jpg"] })}`;
    expect(extractImageCandidates(html, page)).toEqual([
      "https://cdn.example.com/a.jpg",
      "https://cdn.example.com/b.jpg",
      "https://cdn.example.com/og.jpg",
    ]);
  });

  it("finds products in @graph and ImageObjects", () => {
    const html = ld({
      "@context": "https://schema.org",
      "@graph": [
        { "@type": "WebPage", image: "https://cdn.example.com/page.jpg" },
        { "@type": ["Product"], image: { "@type": "ImageObject", url: "https://cdn.example.com/obj.jpg" } },
      ],
    });
    expect(extractImageCandidates(html, page)).toEqual(["https://cdn.example.com/obj.jpg"]);
  });

  it("resolves relative and protocol-relative URLs, dropping duplicates and junk", () => {
    const html = `
      ${ld({ "@type": "Product", image: ["/img/a.jpg", "//cdn.example.com/b.jpg", "data:image/png;base64,xx", ""] })}
      <script type="application/ld+json">{ not json</script>
      <meta property="og:image" content="https://shop.example.com/img/a.jpg">`;
    expect(extractImageCandidates(html, page)).toEqual([
      "https://shop.example.com/img/a.jpg",
      "https://cdn.example.com/b.jpg",
    ]);
  });

  it("returns nothing for a page without images", () => {
    expect(extractImageCandidates("<p>hi</p>", page)).toEqual([]);
  });
});

describe("scrapeImageCandidates", () => {
  const og = (src: string) => `<meta property="og:image" content="${src}">`;
  const respond = (body: string, status = 200): Fetch =>
    async () => new Response(body, { status, headers: { "content-type": "text/html" } });
  const renderer = (render: PageRenderer["render"]): PageRenderer => ({
    render: vi.fn(render),
    close: async () => {},
  });

  it("uses the plain fetch when it finds images", async () => {
    const browser = renderer(async () => ({ html: "", url: page }));
    const found = await scrapeImageCandidates(respond(og("/a.jpg")), page, browser);
    expect(found).toEqual(["https://shop.example.com/a.jpg"]);
    expect(browser.render).not.toHaveBeenCalled();
  });

  it("falls back to the browser when the plain page has no images", async () => {
    const browser = renderer(async () => ({ html: og("/b.jpg"), url: page }));
    const found = await scrapeImageCandidates(respond("<script>challenge()</script>"), page, browser);
    expect(found).toEqual(["https://shop.example.com/b.jpg"]);
  });

  it("falls back to the browser when the plain fetch is refused", async () => {
    const browser = renderer(async () => ({ html: og("/b.jpg"), url: page }));
    await expect(scrapeImageCandidates(respond("", 403), page, browser)).resolves.toHaveLength(1);
  });

  it("reports the browser's robot check over the plain error", async () => {
    const browser = renderer(async () => {
      throw new ScrapeError("robot check");
    });
    await expect(scrapeImageCandidates(respond("", 403), page, browser)).rejects.toThrow("robot check");
  });

  it("keeps the plain error without a browser", async () => {
    await expect(scrapeImageCandidates(respond("", 403), page)).rejects.toThrow(
      "shop.example.com answered 403",
    );
  });
});
