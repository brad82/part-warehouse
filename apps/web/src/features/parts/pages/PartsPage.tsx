import { useState } from "react";
import {
  Box,
  Button,
  Drawer,
  IconButton,
  Tooltip,
  useMediaQuery,
  useTheme,
} from "@mui/material";
import { ChevronLeft, PanelLeftClose, PanelLeftOpen } from "lucide-react";
import { Link as RouterLink } from "react-router-dom";
import { PartView } from "../components/PartView/PartView";
import { PartsTree } from "../components/Sidebar/PartsTree";
import { SearchField } from "../components/Sidebar/SearchField";
import { useSelectedPart } from "../PartsProvider";

export const SIDEBAR_WIDTH = 340;
export const SIDEBAR_COLLAPSED_WIDTH = 48;

const COLLAPSED_KEY = "sidebarCollapsed";

function readCollapsed() {
  try {
    return localStorage.getItem(COLLAPSED_KEY) === "true";
  } catch {
    return false;
  }
}

function writeCollapsed(collapsed: boolean) {
  try {
    localStorage.setItem(COLLAPSED_KEY, String(collapsed));
  } catch {
    // Storage unavailable; the choice just won't persist.
  }
}

const drawerStyles = (width: number) => ({
  width,
  flexShrink: 0,
  transition: (t: { transitions: { create: (p: string) => string } }) =>
    t.transitions.create("width"),
  "& .MuiDrawer-paper": {
    width,
    position: "relative",
    display: "flex",
    flexDirection: "column",
    overflowX: "hidden",
    transition: (t: { transitions: { create: (p: string) => string } }) =>
      t.transitions.create("width"),
  },
});

const pageStyles = {
  root: { display: "flex", flex: 1, minHeight: 0 },
  search: { display: "flex", alignItems: "center", pr: 1 },
  searchField: { flex: 1, minWidth: 0 },
  rail: { display: "flex", justifyContent: "center", pt: 1 },
  treeScroll: { flex: 1, overflowY: "auto", px: 1, pb: 2 },
  content: { flex: 1, minWidth: 0, overflow: "auto" },
  phoneList: {
    flex: 1,
    minWidth: 0,
    display: "flex",
    flexDirection: "column",
    bgcolor: "background.paper",
  },
  phoneBack: { px: 1, pt: 1 },
};

function SidebarContents({ onHide }: { onHide?: () => void }) {
  return (
    <>
      <Box sx={pageStyles.search}>
        <Box sx={pageStyles.searchField}>
          <SearchField />
        </Box>
        {onHide ? (
          <Tooltip title="Hide sidebar">
            <IconButton aria-label="Hide sidebar" onClick={onHide}>
              <PanelLeftClose size={20} />
            </IconButton>
          </Tooltip>
        ) : null}
      </Box>
      <Box sx={pageStyles.treeScroll}>
        <PartsTree />
      </Box>
    </>
  );
}

/** Phones: the tree is the page until a part is picked, then the part replaces it. */
function PhonePartsPage() {
  const { code } = useSelectedPart();

  if (!code) {
    return (
      <Box sx={pageStyles.phoneList}>
        <SidebarContents />
      </Box>
    );
  }
  return (
    <Box sx={pageStyles.content}>
      <Box sx={pageStyles.phoneBack}>
        <Button
          variant="text"
          component={RouterLink}
          to="/viewer"
          startIcon={<ChevronLeft size={18} />}
        >
          Parts
        </Button>
      </Box>
      <PartView />
    </Box>
  );
}

/** Layout only: collapsible sidebar on the left, selected part on the right. */
export function PartsPage() {
  const theme = useTheme();
  const phone = useMediaQuery(theme.breakpoints.down("sm"));
  return phone ? <PhonePartsPage /> : <SidebarPartsPage />;
}

function SidebarPartsPage() {
  const [collapsed, setCollapsed] = useState(readCollapsed);

  function toggle() {
    setCollapsed((prev) => {
      writeCollapsed(!prev);
      return !prev;
    });
  }

  return (
    <Box sx={pageStyles.root}>
      <Drawer
        variant="permanent"
        sx={drawerStyles(collapsed ? SIDEBAR_COLLAPSED_WIDTH : SIDEBAR_WIDTH)}
      >
        {collapsed ? (
          <Box sx={pageStyles.rail}>
            <Tooltip title="Show sidebar" placement="right">
              <IconButton aria-label="Show sidebar" onClick={toggle}>
                <PanelLeftOpen size={20} />
              </IconButton>
            </Tooltip>
          </Box>
        ) : (
          <SidebarContents onHide={toggle} />
        )}
      </Drawer>
      <Box sx={pageStyles.content}>
        <PartView />
      </Box>
    </Box>
  );
}
