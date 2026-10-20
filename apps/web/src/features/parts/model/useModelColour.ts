import { useState } from "react";
import { resolvePreviewColour, type PreviewColour } from "@parts-warehouse/shared";

/** "auto" follows the part's colour attribute; a number is a preview colour id. */
export type ModelColourChoice = "auto" | number;

/**
 * The viewer's model colour for one part: the part's own colour by default,
 * or one the user picks. Picks and a dismissed mismatch notice last until
 * another part is shown.
 */
export function useModelColour(code: string, partColour: string, colours: PreviewColour[]) {
  const [picked, setPicked] = useState<{ code: string; id: number } | null>(null);
  const [dismissedFor, setDismissedFor] = useState<string | null>(null);

  const auto = resolvePreviewColour(colours, partColour);
  const pickedColour =
    picked?.code === code ? colours.find((c) => c.id === picked.id) : undefined;
  const choice: ModelColourChoice = pickedColour ? pickedColour.id : "auto";

  return {
    choice,
    hex: pickedColour?.hex ?? auto.hex,
    /** The resolved "match part" colour, for its swatch. */
    autoHex: auto.hex,
    /** Set when the part names a colour with no preview colour. */
    mismatch:
      !auto.matched && dismissedFor !== code
        ? { partColour: partColour.trim(), shownAs: auto.name }
        : null,
    choose: (next: ModelColourChoice) => setPicked(next === "auto" ? null : { code, id: next }),
    dismissMismatch: () => setDismissedFor(code),
  };
}

export type ModelColour = ReturnType<typeof useModelColour>;
