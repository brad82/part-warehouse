declare module "svg-to-pdfkit" {
  type Options = {
    width?: number;
    height?: number;
    preserveAspectRatio?: string;
    assumePt?: boolean;
    fontCallback?: (family: string, bold: boolean, italic: boolean) => string;
    warningCallback?: (message: string) => void;
  };
  export default function SVGtoPDF(
    doc: PDFKit.PDFDocument,
    svg: string,
    x: number,
    y: number,
    options?: Options,
  ): void;
}
