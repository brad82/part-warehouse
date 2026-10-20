import { serveImageScraper } from "@parts-warehouse/image-scraper-proto";
import { config } from "./config.js";
import { createPageRenderer } from "./lib/pageRenderer.js";
import { createScraper } from "./scraper.js";

const renderer = config.pageBrowser
  ? createPageRenderer({ profileDir: config.browserProfileDir, headed: config.pageBrowserHeaded })
  : null;

const { port, server } = await serveImageScraper(
  createScraper({ renderer }),
  config.address,
  (message, err) => console.error(message, err),
);
console.log(
  `Image scraper listening on port ${port}` +
    (renderer ? ` (browser fallback${config.pageBrowserHeaded ? ", headed" : ""})` : ""),
);

const shutdown = () => {
  server.tryShutdown(() => void renderer?.close().finally(() => process.exit(0)));
};
process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
