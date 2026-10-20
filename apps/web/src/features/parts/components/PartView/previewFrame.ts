/** Shared box for the STL viewer and the image panel, so tabs don't jump. */
export const previewFrameSx = {
  height: { xs: 300, sm: 360, lg: "calc(100dvh - 248px)" },
  minHeight: 360,
  position: "relative",
  overflow: "hidden",
} as const;
