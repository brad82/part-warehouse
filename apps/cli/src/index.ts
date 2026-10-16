import { parseArgs } from "node:util";
import { runImport } from "./commands/import.js";
import { config } from "./config.js";

const usage = `Usage: snowcat <command> [options]

Commands:
  import    Import a parts CSV into the database (re-runnable). Extra columns
            are matched to attributes by key or label; "Part type" sets the type.
            --csv <path>  CSV file (default: ${config.partsIndexCsv})
            --db <path>   SQLite file (default: ${config.dbPath})`;

const { positionals, values } = parseArgs({
  allowPositionals: true,
  options: {
    csv: { type: "string", default: config.partsIndexCsv },
    db: { type: "string", default: config.dbPath },
    help: { type: "boolean", short: "h" },
  },
});

const [command] = positionals;
if (values.help) {
  console.log(usage);
} else if (command === "import") {
  runImport({ csvPath: values.csv, dbPath: values.db });
} else {
  console.error(command ? `Unknown command "${command}"\n\n${usage}` : usage);
  process.exitCode = 1;
}
