import { createContext, useContext } from "react";
import type { LabelAssets, Part } from "@snowcat/shared";

export type FieldOption = { value: string; label: string };

/**
 * What block edit components need to draw themselves, provided by
 * EditorCanvas. Kept apart from the store so blocks only re-render when
 * these change, not on every template edit.
 */
export type CanvasEnv = {
  /** Canvas pixels per millimetre. */
  scale: number;
  /** Part the canvas renders (or `FIELD_NAMES_PART`). */
  part: Part;
  assets: LabelAssets;
  /** Part fields then attribute keys, for `{field}` tokens and QR payloads. */
  fields: FieldOption[];
};

export const CanvasContext = createContext<CanvasEnv | null>(null);

export function useCanvasEnv(): CanvasEnv {
  const env = useContext(CanvasContext);
  if (!env) throw new Error("Label blocks must render inside EditorCanvas");
  return env;
}
