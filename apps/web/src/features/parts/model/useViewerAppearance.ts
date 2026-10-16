import { useState } from "react";

export type ViewerBackground = "theme" | "light" | "dark";

export const VIEWER_BACKGROUNDS: Record<Exclude<ViewerBackground, "theme">, string> = {
  light: "#f2f3f5",
  dark: "#16181b",
};

const STORAGE_KEY = "stlViewerAppearance";

type Appearance = { background: ViewerBackground; grid: boolean };

const DEFAULTS: Appearance = { background: "theme", grid: true };

function load(): Appearance {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const saved = raw ? (JSON.parse(raw) as Partial<Appearance>) : {};
    return {
      background: saved.background ?? DEFAULTS.background,
      grid: saved.grid ?? DEFAULTS.grid,
    };
  } catch {
    return DEFAULTS;
  }
}

/**
 * Owns the STL viewer's background and grid toggle, remembered per browser. The model colour
 * isn't remembered: each part opens in its own colour (useModelColour).
 */
export function useViewerAppearance() {
  const [appearance, setAppearance] = useState<Appearance>(load);

  function save(next: Appearance) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch {
      // Storage blocked: the choice just won't persist.
    }
    setAppearance(next);
  }

  return {
    ...appearance,
    setBackground: (background: ViewerBackground) => save({ ...appearance, background }),
    setGrid: (grid: boolean) => save({ ...appearance, grid }),
  };
}

export type ViewerAppearance = ReturnType<typeof useViewerAppearance>;
