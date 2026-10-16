import { z } from "zod";

export const hexColourSchema = z
  .string()
  .regex(/^#[0-9a-f]{6}$/i, "Use a hex colour like #f1c40f")
  .transform((s) => s.toLowerCase());

export const previewColourSchema = z.object({
  id: z.number().int(),
  /** Matched against a part's colour attribute, ignoring case. */
  name: z.string().trim().min(1),
  hex: hexColourSchema,
  sort: z.number().int(),
});

export const previewColourCreateSchema = previewColourSchema
  .pick({ name: true, hex: true })
  .extend({ sort: z.number().int().optional() });

export const previewColourUpdateSchema = previewColourSchema
  .pick({ name: true, hex: true, sort: true })
  .partial();

export const previewColourIdParamsSchema = z.object({ id: z.coerce.number().int() });

export type PreviewColour = z.infer<typeof previewColourSchema>;
export type PreviewColourCreate = z.infer<typeof previewColourCreateSchema>;
export type PreviewColourUpdate = z.infer<typeof previewColourUpdateSchema>;

/** Shown when a part has no colour, or one with no preview colour. */
export const FALLBACK_PREVIEW_COLOUR = { name: "Black", hex: "#2b2d30" };

/**
 * The preview colour for a part's colour attribute. `matched` is false when
 * the part names a colour the list doesn't have; the result is then Black.
 */
export function resolvePreviewColour(
  colours: Pick<PreviewColour, "name" | "hex">[],
  partColour: string,
): { name: string; hex: string; matched: boolean } {
  const byName = (name: string) =>
    colours.find((c) => c.name.trim().toLowerCase() === name.trim().toLowerCase());
  const black = byName("black") ?? FALLBACK_PREVIEW_COLOUR;
  if (partColour.trim() === "") return { ...pick(black), matched: true };
  const match = byName(partColour);
  return match ? { ...pick(match), matched: true } : { ...pick(black), matched: false };
}

const pick = (c: { name: string; hex: string }) => ({ name: c.name, hex: c.hex });
