import {
  Box,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Typography,
} from "@mui/material";
import { Box as BoxIcon, Network, Palette, Printer, Tag } from "lucide-react";
import { NavLink, Outlet } from "react-router-dom";

const SECTIONS = [
  { to: "/settings", label: "Parts & attributes", icon: <BoxIcon size={18} /> },
  { to: "/settings/bom", label: "BOM structure", icon: <Network size={18} /> },
  {
    to: "/settings/stl-preview",
    label: "STL Preview",
    icon: <Palette size={18} />,
  },
  {
    to: "/settings/label-templates",
    label: "Label templates",
    icon: <Tag size={18} />,
  },
  {
    to: "/settings/devices",
    label: "Printers & devices",
    icon: <Printer size={18} />,
  },
];

const layoutStyles = {
  root: { flex: 1, minWidth: 0, overflow: "auto", p: { xs: 2, md: 3 } },
  body: {
    display: "grid",
    gap: 3,
    gridTemplateColumns: { xs: "1fr", md: "200px minmax(0, 1fr)" },
    alignItems: "start",
  },
  nav: {
    display: { xs: "flex", md: "block" },
    gap: 1,
    overflowX: { xs: "auto", md: "visible" },
    "& .MuiListItemButton-root": {
      borderRadius: 1,
      mb: { md: 0.5 },
      flexShrink: 0,
    },
    "& .MuiListItemIcon-root": { minWidth: 32 },
  },
};

/** Settings title + submenu; the chosen section renders beside it. */
export function SettingsLayout() {
  return (
    <Box sx={layoutStyles.root}>
      <Typography variant="h1" component="h2" sx={{ mb: { xs: 2, md: 3 } }}>
        Settings
      </Typography>
      <Box sx={layoutStyles.body}>
        <List
          component="nav"
          dense
          disablePadding
          aria-label="Settings sections"
          sx={layoutStyles.nav}
        >
          {SECTIONS.map((s) => (
            <ListItemButton key={s.to} component={NavLink} to={s.to} end>
              <ListItemIcon>{s.icon}</ListItemIcon>
              <ListItemText primary={s.label} />
            </ListItemButton>
          ))}
        </List>
        <Outlet />
      </Box>
    </Box>
  );
}
