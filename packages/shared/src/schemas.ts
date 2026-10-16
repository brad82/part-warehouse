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
export type Part = z.infer<typeof partSchema>;
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
