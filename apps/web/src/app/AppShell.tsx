import {
  AppBar,
  Box,
  Button,
  IconButton,
  Toolbar,
  Tooltip,
  Typography,
} from "@mui/material";
import { Boxes, Moon, Settings, Snowflake, Sun } from "lucide-react";
import { Link as RouterLink, useLocation, useNavigate } from "react-router-dom";
import { ScanButton } from "@features/scan";
import type { ThemeMode } from "@shared/hooks/useThemeMode";
import { AppRoutes } from "./router";

type Props = {
  mode: ThemeMode;
  onToggleMode: () => void;
};

export const APP_BAR_HEIGHT = 56;

const shellStyles = {
  // dvh tracks Safari's collapsing toolbar on iPhone; vh would overflow it.
  root: { display: "flex", flexDirection: "column", height: "100dvh" },
  bar: { zIndex: (t: { zIndex: { drawer: number } }) => t.zIndex.drawer + 1 },
  toolbar: {
    minHeight: APP_BAR_HEIGHT,
    gap: { xs: 0.5, sm: 1 },
    px: { xs: 1, sm: 2 },
  },
  brand: {
    display: "flex",
    alignItems: "center",
    gap: 1,
    color: "inherit",
    textDecoration: "none",
    borderRadius: 1,
    px: 0.5,
    "&:hover": { opacity: 0.85 },
    "&:focus-visible": { outline: "2px solid currentColor", outlineOffset: 2 },
  },
  title: { fontWeight: 700, display: { xs: "none", sm: "block" } },
  spacer: { flexGrow: 1 },
  main: { flex: 1, minHeight: 0, display: "flex" },
  nav: {
    textTransform: "none",
    fontWeight: 600,
    whiteSpace: "nowrap",
    // Icon only on phones.
    minWidth: { xs: 40, sm: 64 },
    "& .MuiButton-startIcon": { mr: { xs: 0, sm: 1 } },
  },
  navLabel: { display: { xs: "none", sm: "inline" } },
  navActive: {
    bgcolor: "rgba(255,255,255,0.2)",
    "&:hover": { bgcolor: "rgba(255,255,255,0.28)" },
  },
};

function PartsViewerNavButton() {
  const { pathname } = useLocation();
  const active = pathname === "/" || pathname.startsWith("/parts");

  return (
    <Button
      component={RouterLink}
      to="/"
      color="inherit"
      aria-label="Parts Viewer"
      startIcon={<Boxes size={18} />}
      aria-current={active ? "page" : undefined}
      sx={[shellStyles.nav, active && shellStyles.navActive]}
    >
      <Box component="span" sx={shellStyles.navLabel}>
        Parts Viewer
      </Box>
    </Button>
  );
}

export function AppShell({ mode, onToggleMode }: Props) {
  const navigate = useNavigate();
  return (
    <Box sx={shellStyles.root}>
      <AppBar position="static" elevation={0} sx={shellStyles.bar}>
        <Toolbar variant="dense" sx={shellStyles.toolbar}>
          <Box
            component={RouterLink}
            to="/catalog"
            aria-label="Go to catalog"
            sx={shellStyles.brand}
          >
            <Snowflake size={20} />
            <Typography variant="h3" component="h1" sx={shellStyles.title}>
              Snowcat Parts
            </Typography>
          </Box>
          <PartsViewerNavButton />
          <Box sx={shellStyles.spacer} />
          <ScanButton />
          <Tooltip title="Settings">
            <IconButton
              color="inherit"
              aria-label="Settings"
              onClick={() => navigate("/settings")}
            >
              <Settings size={20} />
            </IconButton>
          </Tooltip>
          <Tooltip title={mode === "dark" ? "Light mode" : "Dark mode"}>
            <IconButton color="inherit" onClick={onToggleMode}>
              {mode === "dark" ? <Sun size={20} /> : <Moon size={20} />}
            </IconButton>
          </Tooltip>
        </Toolbar>
      </AppBar>
      <Box component="main" sx={shellStyles.main}>
        <AppRoutes />
      </Box>
    </Box>
  );
}
