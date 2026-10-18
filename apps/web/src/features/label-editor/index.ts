import { lazy } from "react";

/** Gutenberg-based label template editor, in its own chunk. Render inside Suspense. */
export const LabelEditorContainer = lazy(
  () => import("./pages/LabelEditorContainer"),
);
