import path from "node:path";
import { parseArgs } from "node:util";
import { runImport } from "./commands/import.js";
import { runLabels } from "./commands/labels.js";
import { config } from "./config.js";

const usage = `Usage: snowcat <command> [options]

Commands:
  import    Import a parts CSV into the database (re-runnable). Extra columns
            are matched to attributes by key or label; "Part type" sets the type.
            --csv <path>  CSV file (default: ${config.partsIndexCsv})
            --db <path>   SQLite file (default: ${config.dbPath})

  labels [codes…]
            PDF of labels on an Avery 5160 sheet (3×10, US Letter), one per
            part: the codes given plus any parts matching --query.
            --template <id> Label template (default: small); must fit a slot
            --query <text>  Same search as the app (code, name, group, …)
            --start <n>     First free slot, 1–30, left→right (default: 1)
            --out <path>    PDF file (default: labels.pdf)
            --db <path>     SQLite file (default: ${config.dbPath})`;

const { positionals, values } = parseArgs({
  allowPositionals: true,
  options: {
    csv: { type: "string", default: config.partsIndexCsv },
    db: { type: "string", default: config.dbPath },
    query: { type: "string" },
    template: { type: "string", default: "small" },
    start: { type: "string", default: "1" },
    out: { type: "string", default: "labels.pdf" },
    help: { type: "boolean", short: "h" },
  },
});

const [command, ...args] = positionals;
if (values.help) {
  console.log(usage);
} else if (command === "import") {
  runImport({ csvPath: values.csv, dbPath: values.db });
} else if (command === "labels") {
  await runLabels({
    dbPath: values.db,
    templatesDir: config.labelTemplatesDir,
    templateId: values.template,
    codes: args,
    query: values.query,
    start: Number(values.start),
    // npm runs scripts from apps/cli; resolve against where it was invoked.
    outPath: path.resolve(process.env.INIT_CWD ?? process.cwd(), values.out),
  }).catch((err: Error) => {
    console.error(err.message);
    process.exitCode = 1;
  });
} else {
  console.error(command ? `Unknown command "${command}"\n\n${usage}` : usage);
  process.exitCode = 1;
}
