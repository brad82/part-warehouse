/**
 * Prints parts' labels onto an Avery 5160 sheet as a PDF, from a stored
 * label template (default `small`): the same templates the web app prints,
 * so the two never drift.
 */
import { writeFileSync } from "node:fs";
import type Database from "better-sqlite3";
import PDFDocument from "pdfkit";
import SVGtoPDF from "svg-to-pdfkit";
import {
  labelTemplatesRepository,
  loadLabelTemplateFiles,
  openDb,
  partsRepository,
} from "@parts-warehouse/db";
import {
  AVERY_5160,
  renderLabelSvg,
  sheetCapacity,
  slotPosition,
  type LabelSheet,
  type LabelLayout,
  type LabelTemplate,
  type Part,
} from "@parts-warehouse/shared";

const MM_TO_PT = 72 / 25.4;

/** Parts named by `codes` plus any matching `query`, sorted by code. */
export function selectParts(
  db: Database.Database,
  { codes, query }: { codes: string[]; query?: string },
): Part[] {
  if (!codes.length && !query)
    throw new Error("Give part codes and/or --query");
  const repo = partsRepository(db);
  const byCode = new Map<string, Part>();
  const missing: string[] = [];
  for (const code of codes) {
    const part = repo.getPart(code);
    if (part) byCode.set(part.code, part);
    else missing.push(code);
  }
  if (missing.length)
    throw new Error(`Unknown part codes: ${missing.join(", ")}`);
  if (query)
    for (const part of repo.listParts(query)) byCode.set(part.code, part);
  return [...byCode.values()].sort((a, b) => a.code.localeCompare(b.code));
}

// The SVG's fonts, as standard PDF fonts (same metrics the template wraps with).
function pdfFont(family: string, bold: boolean): string {
  if (/courier|mono/i.test(family)) return bold ? "Courier-Bold" : "Courier";
  return bold ? "Helvetica-Bold" : "Helvetica";
}

/** The stored template `id`; throws listing the ids there are. */
export function selectTemplate(
  db: Database.Database,
  id: string,
): LabelTemplate {
  const repo = labelTemplatesRepository(db);
  const template = repo.get(id);
  if (template) return template;
  const ids = repo.list().map((t) => t.id);
  throw new Error(`Unknown template "${id}". Templates: ${ids.join(", ")}`);
}

/** Throws unless `template` fits one of `sheet`'s slots. */
export function assertFitsSheet(template: LabelTemplate, sheet: LabelSheet) {
  const slack = 0.01;
  if (
    template.widthMm > sheet.columnPitchMm + slack ||
    template.heightMm > sheet.rowPitchMm + slack
  ) {
    throw new Error(
      `"${template.name}" is ${template.widthMm}×${template.heightMm}mm; ` +
        `${sheet.id} slots are ${sheet.columnPitchMm}×${sheet.rowPitchMm}mm`,
    );
  }
}

/** One label per part from slot `start` on; returns the PDF and page count. */
export function renderLabelsPdf(
  parts: Part[],
  {
    template,
    start = 1,
    sheet = AVERY_5160,
  }: { template: LabelLayout; start?: number; sheet?: LabelSheet },
): Promise<{ pdf: Buffer; pages: number }> {
  const doc = new PDFDocument({
    size: [sheet.pageWidthMm * MM_TO_PT, sheet.pageHeightMm * MM_TO_PT],
    margin: 0,
    info: { Title: "Parts Warehouse labels" },
  });
  const chunks: Buffer[] = [];
  doc.on("data", (chunk: Buffer) => chunks.push(chunk));
  const done = new Promise<Buffer>((resolve) =>
    doc.on("end", () => resolve(Buffer.concat(chunks))),
  );

  let pages = 1;
  parts.forEach((part, i) => {
    const { page, xMm, yMm } = slotPosition(sheet, start + i);
    while (pages <= page) {
      doc.addPage();
      pages++;
    }
    SVGtoPDF(
      doc,
      renderLabelSvg(template, part),
      xMm * MM_TO_PT,
      yMm * MM_TO_PT,
      {
        width: template.widthMm * MM_TO_PT,
        height: template.heightMm * MM_TO_PT,
        fontCallback: pdfFont,
      },
    );
  });
  doc.end();
  return done.then((pdf) => ({ pdf, pages }));
}

export async function runLabels({
  dbPath,
  templatesDir,
  templateId,
  codes,
  query,
  start,
  outPath,
}: {
  dbPath: string;
  /** Built-in templates, added to the db if missing (as the API does). */
  templatesDir: string;
  templateId: string;
  codes: string[];
  query?: string;
  start: number;
  outPath: string;
}) {
  const capacity = sheetCapacity(AVERY_5160);
  if (!Number.isInteger(start) || start < 1 || start > capacity) {
    throw new Error(`--start must be a whole number from 1 to ${capacity}`);
  }
  const db = openDb(dbPath);
  let parts: Part[];
  let template: LabelTemplate;
  try {
    labelTemplatesRepository(db).ensureBuiltins(
      loadLabelTemplateFiles(templatesDir),
    );
    template = selectTemplate(db, templateId);
    assertFitsSheet(template, AVERY_5160);
    parts = selectParts(db, { codes, query });
  } finally {
    db.close();
  }
  if (!parts.length) throw new Error(`No parts match "${query}"`);
  const { pdf, pages } = await renderLabelsPdf(parts, { template, start });
  writeFileSync(outPath, pdf);
  console.log(
    `Wrote ${parts.length} labels (${pages} sheet${pages === 1 ? "" : "s"}) to ${outPath}`,
  );
}
