import { z } from "zod";
import { SYMBOLOGIES } from "./symbologies.js";
import type {
  LabelBarcodeElement,
  LabelElement,
  LabelImageElement,
  LabelTemplate,
  LabelTemplateInput,
  LabelTextElement,
  Symbology,
} from "./types.js";

const mm = z.number().finite();
const sizeMm = mm.positive();

const barcodeElementSchema = z.object({
  type: z.literal("barcode"),
  symbology: z.enum(Object.keys(SYMBOLOGIES) as [Symbology, ...Symbology[]]),
  field: z.string().min(1),
  x: mm,
  y: mm,
  width: sizeMm,
  height: sizeMm,
  showText: z.boolean().optional(),
  ecLevel: z.enum(["L", "M", "Q", "H"]).optional(),
  rectangular: z.boolean().optional(),
  checkDigit: z.boolean().optional(),
}) satisfies z.ZodType<LabelBarcodeElement>;

const textElementSchema = z.object({
  type: z.literal("text"),
  text: z.string(),
  x: mm,
  y: mm,
  width: sizeMm,
  font: z.enum(["sans", "sans-bold", "mono-bold"]),
  fontSizePt: sizeMm,
  lineHeight: sizeMm,
  maxLines: z.number().int().min(1),
}) satisfies z.ZodType<LabelTextElement>;

const imageElementSchema = z.object({
  type: z.literal("image"),
  source: z.literal("render"),
  x: mm,
  y: mm,
  width: sizeMm,
  height: sizeMm,
  outlineWidth: mm.nonnegative().optional(),
}) satisfies z.ZodType<LabelImageElement>;

export const labelElementSchema = z.discriminatedUnion("type", [
  barcodeElementSchema,
  textElementSchema,
  imageElementSchema,
]) satisfies z.ZodType<LabelElement>;

/** Body of POST / PUT /label-templates, and an exported template file. */
export const labelTemplateInputSchema = z.object({
  name: z.string().trim().min(1),
  description: z.string().trim().nullable().default(null),
  widthMm: sizeMm,
  heightMm: sizeMm,
  elements: z.array(labelElementSchema),
}) satisfies z.ZodType<LabelTemplateInput, z.ZodTypeDef, unknown>;

export const labelTemplateSchema = labelTemplateInputSchema.extend({
  id: z.string(),
  builtin: z.boolean(),
  updatedAt: z.string(),
}) satisfies z.ZodType<LabelTemplate, z.ZodTypeDef, unknown>;

export const labelTemplateIdParamsSchema = z.object({ id: z.string().min(1) });

/**
 * A part's label to render as a PDF or send to the label printer. `render`
 * is the part's picture as a data URL (the web app renders STLs).
 */
export const labelPrintRequestSchema = z.object({
  code: z.string().min(1),
  templateId: z.string().min(1),
  copies: z.number().int().min(1).max(50).default(1),
  render: z
    .string()
    .regex(/^data:image\/(png|jpeg);base64,/)
    .nullish(),
});

export type LabelPrintRequest = z.input<typeof labelPrintRequestSchema>;
