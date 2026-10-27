import { z } from "zod";

/** Part code: batch letter + sub-assembly, parts group, revision + part no. */
export const PART_CODE_PATTERN = /[A-Z]\d{2}-\d{3}-\d{3}/;

export const partCodeSchema = z
  .string()
  .regex(new RegExp(`^${PART_CODE_PATTERN.source}$`), "Invalid part code");

export const partStatusSchema = z.enum(["planned", "completed"]);

export const taxonomySchema = z.enum(["module", "subassembly", "group"]);

export const groupingSchema = z.object({
  id: z.string(),
  taxonomy: taxonomySchema,
  name: z.string(),
  revision: z.number().int(),
  parentId: z.string().nullable(),
});

export const partTypeIdSchema = z
  .string()
  .regex(/^[a-z][a-z0-9_-]*$/, "Use lowercase letters, digits, - or _");

export const partTypeSchema = z.object({
  id: partTypeIdSchema,
  name: z.string().trim().min(1),
  sort: z.number().int(),
});

export const partTypeCreateSchema = partTypeSchema
  .pick({ id: true, name: true })
  .extend({ sort: z.number().int().optional() });

export const partTypeUpdateSchema = partTypeSchema
  .pick({ name: true, sort: true })
  .partial();

export const attributeDataTypeSchema = z.enum([
  "text",
  "integer",
  "number",
  "currency",
  "url",
  "select",
]);

export const attributeKeySchema = z
  .string()
  .regex(/^[a-z][a-z0-9_]*$/, "Use lowercase letters, digits and _");

export const attributeDefSchema = z.object({
  id: z.number().int(),
  key: attributeKeySchema,
  label: z.string().trim().min(1),
  dataType: attributeDataTypeSchema,
  unit: z.string().nullable(),
  /** Allowed values; select only. */
  options: z.array(z.string().trim().min(1)).nullable(),
  /** Read by code (STL path, totals, viewer colour): key and type are fixed. */
  system: z.boolean(),
  sort: z.number().int(),
  partTypeIds: z.array(z.string()),
});

const attributeDefInputSchema = attributeDefSchema.pick({
  key: true,
  label: true,
  dataType: true,
  unit: true,
  options: true,
  sort: true,
  partTypeIds: true,
});

export const attributeDefCreateSchema = attributeDefInputSchema
  .partial({ unit: true, options: true, sort: true, partTypeIds: true })
  .refine((d) => d.dataType !== "select" || (d.options?.length ?? 0) > 0, {
    message: "A select needs at least one option",
    path: ["options"],
  });

export const attributeDefUpdateSchema = attributeDefInputSchema.partial();

/** Stored as text; numeric types come back as numbers. */
export const attributeValueSchema = z.union([z.string(), z.number()]);

export const groupingUpdateSchema = groupingSchema
  .pick({ name: true, revision: true })
  .partial();

/** Code shape per level: module A, sub-assembly A01, group A01-001. */
export const GROUPING_ID_PATTERNS: Record<z.infer<typeof taxonomySchema>, RegExp> = {
  module: /^[A-Z]$/,
  subassembly: /^[A-Z]\d{2}$/,
  group: /^[A-Z]\d{2}-\d{3}$/,
};

/** A new grouping. Its code must sit under its parent's code. */
export const groupingCreateSchema = groupingSchema
  .pick({ id: true, taxonomy: true, name: true, parentId: true })
  .extend({ name: z.string().trim().min(1) })
  .superRefine((g, ctx) => {
    if (!GROUPING_ID_PATTERNS[g.taxonomy].test(g.id)) {
      ctx.addIssue({ code: "custom", path: ["id"], message: `Invalid ${g.taxonomy} code` });
    }
    const underParent =
      g.taxonomy === "module"
        ? g.parentId === null
        : !!g.parentId &&
          g.id.startsWith(g.taxonomy === "group" ? `${g.parentId}-` : g.parentId);
    if (!underParent) {
      ctx.addIssue({ code: "custom", path: ["parentId"], message: "Code doesn't match its parent" });
    }
  });

/**
 * A part's preview image. The file is served by `GET /parts/:code/image`;
 * `updatedAt` changes with each new image, so it doubles as a cache-buster.
 * `candidates` are the image URLs the last supplier-link scrape found.
 */
export const partImageSchema = z.object({
  source: z.enum(["upload", "scrape"]),
  sourceUrl: z.string().nullable(),
  candidates: z.array(z.string()),
  updatedAt: z.string(),
});

/** Optional modules the API has (GET /capabilities). */
export const capabilitiesSchema = z.object({
  imageScraper: z.boolean(),
  /** CUPS queue labels print to from the API; null: the browser prints. */
  labelPrinter: z.string().nullable(),
});

export const partImageSelectSchema = z.object({ url: z.string().url() });

export const partSchema = z.object({
  code: partCodeSchema,
  groupId: z.string(),
  part: z.string(),
  revision: z.number().int(),
  name: z.string(),
  partTypeId: z.string(),
  qtyPerBuild: z.number().int().nonnegative(),
  notes: z.string().nullable(),
  onHand: z.number().int().nonnegative(),
  /** Set values by attribute key. An unset attribute is absent. */
  attributes: z.record(z.string(), attributeValueSchema),
  status: partStatusSchema,
  source: z.string(),
  updatedAt: z.string(),
  image: partImageSchema.nullable(),
});

/**
 * Fields a user may edit. Code, group and source are fixed by the index.
 * `attributes` is a partial map: listed keys are set, null clears one.
 * Values are checked against their definitions by the API.
 */
export const partUpdateSchema = partSchema
  .pick({
    name: true,
    revision: true,
    partTypeId: true,
    qtyPerBuild: true,
    notes: true,
    onHand: true,
    status: true,
  })
  .extend({
    attributes: z.record(z.string(), attributeValueSchema.nullable()),
  })
  .partial();

/** A new part. The code is built from group, revision and part number. */
export const partCreateSchema = z.object({
  groupId: z.string().regex(/^[A-Z]\d{2}-\d{3}$/, "Invalid group"),
  part: z.string().regex(/^\d{2}$/, "Two digits, e.g. 07"),
  revision: z.number().int().min(0).max(9),
  name: z.string().trim().min(1),
  partTypeId: z.string(),
  qtyPerBuild: z.number().int().nonnegative(),
  notes: z.string().nullable().optional(),
  attributes: z.record(z.string(), attributeValueSchema).optional(),
});

export const partListQuerySchema = z.object({
  q: z.string().trim().optional(),
});

export const partCodeParamsSchema = z.object({ code: partCodeSchema });
export const groupingIdParamsSchema = z.object({ id: z.string() });
export const partTypeIdParamsSchema = z.object({ id: z.string() });
export const attributeIdParamsSchema = z.object({ id: z.coerce.number().int() });

export type PartStatus = z.infer<typeof partStatusSchema>;
export type Taxonomy = z.infer<typeof taxonomySchema>;
export type Grouping = z.infer<typeof groupingSchema>;
export type GroupingUpdate = z.infer<typeof groupingUpdateSchema>;
export type GroupingCreate = z.infer<typeof groupingCreateSchema>;
export type Part = z.infer<typeof partSchema>;
export type PartImage = z.infer<typeof partImageSchema>;
export type Capabilities = z.infer<typeof capabilitiesSchema>;

/** A printer the API's machine can print to (a CUPS queue). */
export const printerSchema = z.object({
  name: z.string(),
  /** False when CUPS has the queue paused or disabled. */
  enabled: z.boolean(),
  /** CUPS's status line, e.g. "idle" or "Out of labels." */
  status: z.string(),
});

export const labelPrinterSettingSchema = z.object({
  /** CUPS queue name; null: the browser prints labels. */
  printer: z.string().min(1).nullable(),
});

export type Printer = z.infer<typeof printerSchema>;
export type LabelPrinterSetting = z.infer<typeof labelPrinterSettingSchema>;
export type PartUpdate = z.infer<typeof partUpdateSchema>;
export type PartCreate = z.infer<typeof partCreateSchema>;
export type PartType = z.infer<typeof partTypeSchema>;
export type PartTypeCreate = z.infer<typeof partTypeCreateSchema>;
export type PartTypeUpdate = z.infer<typeof partTypeUpdateSchema>;
export type AttributeDataType = z.infer<typeof attributeDataTypeSchema>;
export type AttributeDef = z.infer<typeof attributeDefSchema>;
export type AttributeDefCreate = z.infer<typeof attributeDefCreateSchema>;
export type AttributeDefUpdate = z.infer<typeof attributeDefUpdateSchema>;
export type AttributeValue = z.infer<typeof attributeValueSchema>;
