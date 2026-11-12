import { createImageScraperClient } from "@parts-warehouse/image-scraper-proto";
import { buildServer } from "./app.js";
import { config } from "./config.js";
import { appSettings } from "./projects/appSettings.js";
import { projectStore } from "./projects/projectStore.js";

const settings = appSettings(config.dataDir);
const projects = projectStore(config.dataDir, settings);

const scraper = config.imageScraperUrl ? createImageScraperClient(config.imageScraperUrl) : null;
const app = await buildServer({ projects, settings, scraper });
app.addHook("onClose", async () => projects.close());
if (scraper) app.addHook("onClose", async () => scraper.close());
await app.listen({ port: config.port, host: config.host });
