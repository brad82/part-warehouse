import { CssBaseline, ThemeProvider } from "@mui/material";
import { BrowserRouter } from "react-router-dom";
import { useThemeMode } from "@shared/hooks/useThemeMode";
import { AppProviders } from "./providers";
import { AppShell } from "./AppShell";

export function App() {
  const { mode, theme, toggleMode } = useThemeMode();

  return (
    <AppProviders>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <BrowserRouter>
          <AppShell mode={mode} onToggleMode={toggleMode} />
        </BrowserRouter>
      </ThemeProvider>
    </AppProviders>
  );
}
