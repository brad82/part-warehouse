import { execFile, spawn } from "node:child_process";
import { promisify } from "node:util";
import type { Printer } from "@parts-warehouse/shared";

const run = promisify(execFile);
const MM_TO_PT = 72 / 25.4;

/** The API machine's printers: lists them and prints label PDFs to one. */
export type PrintSystem = {
  listPrinters(): Promise<Printer[]>;
  /** Prints `pdf` (one label per page) on the queue `printer`. */
  print(
    printer: string,
    pdf: Buffer,
    options: { widthMm: number; heightMm: number; copies: number },
  ): Promise<void>;
};

/**
 * The printer's paper size for a `widthMm`×`heightMm` label. Driver sizes
 * named `w<pt>h<pt>` (Dymo, Brother: `w167h288`, `w167h288.1` for a
 * second label of that size) match within a point; with none, a CUPS
 * custom size.
 */
export function pickMedia(
  sizes: string[],
  widthMm: number,
  heightMm: number,
): string {
  const w = widthMm * MM_TO_PT;
  const h = heightMm * MM_TO_PT;
  const match = sizes.find((size) => {
    const m = /^w(\d+)h(\d+)/.exec(size);
    return !!m && Math.abs(+m[1] - w) <= 1 && Math.abs(+m[2] - h) <= 1;
  });
  return match ?? `Custom.${widthMm}x${heightMm}mm`;
}

/** Paper sizes from `lpoptions -l`'s PageSize line ("*" marks the default). */
export function parsePageSizes(lpoptions: string): string[] {
  const line = lpoptions
    .split("\n")
    .find((l) => l.startsWith("PageSize/") || l.startsWith("media/"));
  if (!line) return [];
  return line
    .slice(line.indexOf(":") + 1)
    .trim()
    .split(/\s+/)
    .map((s) => s.replace(/^\*/, ""));
}

/**
 * Printers from `lpstat -p`: a "printer <name> …" line each, then an
 * indented line when the printer reports a message ("Out of labels.").
 */
export function parseLpstat(lpstat: string): Printer[] {
  const printers: Printer[] = [];
  for (const line of lpstat.split("\n")) {
    const m = /^printer (\S+) (.*)$/.exec(line);
    if (m) {
      const [, name, rest] = m;
      const enabled = !/\bdisabled\b/.test(rest);
      const status = !enabled
        ? "disabled"
        : /now printing/.test(rest)
          ? "printing"
          : "idle";
      printers.push({ name, enabled, status });
    } else if (/^\s+\S/.test(line) && printers.length) {
      printers[printers.length - 1].status = line.trim();
    }
  }
  return printers;
}

/** The Mac's (or CUPS_SERVER's) printers, through `lpstat` and `lp`. */
export const cupsPrintSystem: PrintSystem = {
  async listPrinters() {
    try {
      return parseLpstat((await run("lpstat", ["-p"])).stdout);
    } catch (e) {
      // lpstat exits non-zero when there are no printers at all.
      if ((e as { stdout?: string }).stdout === "") return [];
      throw e;
    }
  },

  async print(name, pdf, { widthMm, heightMm, copies }) {
    const { stdout } = await run("lpoptions", ["-p", name, "-l"]);
    const media = pickMedia(parsePageSizes(stdout), widthMm, heightMm);
    await new Promise<void>((resolve, reject) => {
      const lp = spawn("lp", [
        "-d",
        name,
        "-n",
        String(copies),
        "-o",
        `media=${media}`,
        "-",
      ]);
      let stderr = "";
      lp.stderr.on("data", (chunk) => (stderr += chunk));
      lp.on("error", reject);
      lp.on("close", (code) =>
        code === 0
          ? resolve()
          : reject(new Error(stderr.trim() || `lp exited with ${code}`)),
      );
      lp.stdin.end(pdf);
    });
  },
};
