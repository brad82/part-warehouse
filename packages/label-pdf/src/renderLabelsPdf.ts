import PDFDocument from "pdfkit";
import SVGtoPDF from "svg-to-pdfkit";
import { renderLabelSvg, slotPosition } from "@parts-warehouse/labels";
import {
  type LabelAssets,
  type LabelLayout,
  type LabelSheet,
  type Part,
} from "@parts-warehouse/shared";

const MM_TO_PT = 72 / 25.4;

// The SVG's fonts, as standard PDF fonts (same metrics the template wraps with).
function pdfFont(family: string, bold: boolean): string {
  if (/courier|mono/i.test(family)) return bold ? "Courier-Bold" : "Courier";
  return bold ? "Helvetica-Bold" : "Helvetica";
}

/**
 * One label per part from slot `start` of `sheet` on; returns the PDF and
 * page count. `assets` gives each part's images (e.g. its render).
 */
export function renderLabelsPdf(
  parts: Part[],
  {
    template,
    sheet,
    start = 1,
    assets,
  }: {
    template: LabelLayout;
    sheet: LabelSheet;
    start?: number;
    assets?: (part: Part) => LabelAssets;
  },
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
      renderLabelSvg(template, part, assets?.(part)),
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
