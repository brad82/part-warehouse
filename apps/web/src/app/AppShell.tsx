import {
  AppBar,
  Box,
  IconButton,
  ToggleButton,
  ToggleButtonGroup,
  Toolbar,
  Tooltip,
  Typography,
} from "@mui/material";
import { ListTree, Moon, Settings, Snowflake, Sun, Table2 } from "lucide-react";
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
  root: { display: "flex", flexDirection: "column", height: "100vh" },
  bar: { zIndex: (t: { zIndex: { drawer: number } }) => t.zIndex.drawer + 1 },
  toolbar: { minHeight: APP_BAR_HEIGHT, gap: 1 },
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
  title: { fontWeight: 700 },
  spacer: { flexGrow: 1 },
  main: { flex: 1, minHeight: 0, display: "flex" },
  views: {
    "& .MuiToggleButton-root": { color: "inherit", borderColor: "currentColor", py: 0.5 },
    "& .Mui-selected": { bgcolor: "rgba(255,255,255,0.2) !important" },
  },
};

function ViewToggle() {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  // Neither toggle is selected on Settings.
  const view = pathname.startsWith("/catalog")
    ? "catalog"
    : pathname.startsWith("/settings")
      ? null
      : "tree";

  return (
    <ToggleButtonGroup
      size="small"
      exclusive
      value={view}
      onChange={(_e, next) => next && navigate(next === "catalog" ? "/catalog" : "/")}
      sx={shellStyles.views}
    >
      <Tooltip title="Tree view">
        <ToggleButton value="tree" aria-label="Tree view">
          <ListTree size={18} />
        </ToggleButton>
      </Tooltip>
      <Tooltip title="Table view">
        <ToggleButton value="catalog" aria-label="Table view">
          <Table2 size={18} />
        </ToggleButton>
      </Tooltip>
    </ToggleButtonGroup>
  );
}

export function AppShell({ mode, onToggleMode }: Props) {
  const navigate = useNavigate();
  return (
    <Box sx={shellStyles.root}>
      <AppBar position="static" elevation={0} sx={shellStyles.bar}>
        <Toolbar variant="dense" sx={shellStyles.toolbar}>
          <Box component={RouterLink} to="/catalog" aria-label="Go to catalog" sx={shellStyles.brand}>
            <Snowflake size={20} />
            <Typography variant="h3" component="h1" sx={shellStyles.title}>
              Snowcat Parts
            </Typography>
          </Box>
          <Box sx={shellStyles.spacer} />
          <ViewToggle />
          <ScanButton />
          <Tooltip title="Settings">
            <IconButton color="inherit" aria-label="Settings" onClick={() => navigate("/settings")}>
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
