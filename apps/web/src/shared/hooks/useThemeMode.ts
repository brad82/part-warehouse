import { useCallback, useEffect, useMemo, useState } from "react";
import { useMediaQuery } from "@mui/material";
import { makeTheme } from "../lib/theme";

export type ThemeMode = "light" | "dark";

function initialMode(prefersDark: boolean): ThemeMode {
  const stored = localStorage.getItem("themeMode");
  return stored === "light" || stored === "dark"
    ? stored
    : prefersDark
      ? "dark"
      : "light";
}

export function useThemeMode() {
  const prefersDark = useMediaQuery("(prefers-color-scheme: dark)");
  const [mode, setMode] = useState<ThemeMode>(() => initialMode(prefersDark));
  const theme = useMemo(() => makeTheme(mode), [mode]);

  const setThemeMode = useCallback((next: ThemeMode) => {
    localStorage.setItem("themeMode", next);
    setMode(next);
  }, []);

  function toggleMode() {
    setThemeMode(mode === "dark" ? "light" : "dark");
  }

  useEffect(() => {
    if (!import.meta.env.DEV) return;
    const w = window as typeof window & {
      setThemeMode?: (mode: ThemeMode) => void;
    };
    w.setThemeMode = (next) => {
      if (next !== "light" && next !== "dark") {
        console.warn(`setThemeMode: expected "light" or "dark", got`, next);
        return;
      }
      setThemeMode(next);
    };
    return () => {
      delete w.setThemeMode;
    };
  }, [setThemeMode]);

  return { mode, theme, toggleMode };
}
