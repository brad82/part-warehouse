import {
  AppBar,
  Box,
  Button,
  IconButton,
  Toolbar,
  Tooltip,
} from "@mui/material";
import { alpha, type Theme } from "@mui/material/styles";
import type { ReactNode } from "react";
import { Boxes, LayoutDashboard, Moon, Settings, Sun, Table2 } from "lucide-react";
import { Link as RouterLink, useLocation, useNavigate } from "react-router-dom";
import { NewPartButton } from "@features/parts";
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
  navList: { display: "flex", gap: { xs: 0.5, sm: 1 } },
  spacer: { flexGrow: 1 },
  divider: {
    width: "1px",
    height: 24,
    mx: { xs: 0.25, sm: 0.5 },
    flexShrink: 0,
    // White on the light-mode bar, dark on the dark-mode one.
    bgcolor: (t: Theme) => alpha(t.palette.primary.contrastText, 0.35),
  },
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

type NavItem = {
  to: string;
  label: string;
  icon: ReactNode;
  isActive: (pathname: string) => boolean;
};

const NAV_ITEMS: NavItem[] = [
  {
    to: "/",
    label: "Dashboard",
    icon: <LayoutDashboard size={18} />,
    isActive: (p) => p === "/",
  },
  {
    to: "/viewer",
    label: "Part Lookup",
    icon: <Boxes size={18} />,
    isActive: (p) => p.startsWith("/viewer"),
  },
  {
    to: "/bom",
    label: "BOM",
    icon: <Table2 size={18} />,
    isActive: (p) => p.startsWith("/bom"),
  },
];

function NavButton({ to, label, icon, isActive }: NavItem) {
  const { pathname } = useLocation();
  const active = isActive(pathname);

  return (
    <Button
      component={RouterLink}
      to={to}
      color="inherit"
      aria-label={label}
      startIcon={icon}
      aria-current={active ? "page" : undefined}
      sx={[shellStyles.nav, active && shellStyles.navActive]}
    >
      <Box component="span" sx={shellStyles.navLabel}>
        {label}
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
          <Box component="nav" sx={shellStyles.navList}>
            {NAV_ITEMS.map((item) => (
              <NavButton key={item.to} {...item} />
            ))}
          </Box>
          <Box sx={shellStyles.spacer} />
          <NewPartButton />
          <ScanButton />
          <Box aria-hidden sx={shellStyles.divider} />
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
