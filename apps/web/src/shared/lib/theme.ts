import { createTheme, type PaletteMode } from "@mui/material/styles";

export function makeTheme(mode: PaletteMode) {
  return createTheme({
    palette: {
      mode,
      primary: {
        main: mode === "dark" ? "#8bd3ff" : "#0067a8",
      },
      secondary: {
        main: mode === "dark" ? "#ffd166" : "#8a5a00",
      },
      background: {
        default: mode === "dark" ? "#101418" : "#f6f8fa",
        paper: mode === "dark" ? "#171d23" : "#ffffff",
      },
    },
    shape: {
      borderRadius: 8,
    },
    typography: {
      fontFamily: "'Inter', 'Roboto', 'Helvetica', 'Arial', sans-serif",
      h1: { fontSize: "2rem", fontWeight: 700 },
      h2: { fontSize: "1.5rem", fontWeight: 700 },
      h3: { fontSize: "1.15rem", fontWeight: 700 },
    },
    components: {
      MuiButton: {
        defaultProps: { variant: "contained" },
      },
      MuiCard: {
        styleOverrides: {
          root: { borderRadius: 8 },
        },
      },
    },
  });
}
