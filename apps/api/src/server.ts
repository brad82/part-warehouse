import { openDb } from "@snowcat/db";
import { buildServer } from "./app.js";
import { config } from "./config.js";

const app = await buildServer({ db: openDb(config.dbPath) });
await app.listen({ port: config.port, host: config.host });
