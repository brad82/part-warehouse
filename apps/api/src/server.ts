import { openDb } from "@parts-warehouse/db";
import { createImageScraperClient } from "@parts-warehouse/image-scraper-proto";
import { buildServer } from "./app.js";
import { config } from "./config.js";

const scraper = config.imageScraperUrl ? createImageScraperClient(config.imageScraperUrl) : null;
const app = await buildServer({ db: openDb(config.dbPath), scraper });
if (scraper) app.addHook("onClose", async () => scraper.close());
await app.listen({ port: config.port, host: config.host });
