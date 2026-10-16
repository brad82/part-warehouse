import { useState } from "react";
import { Box, Drawer, IconButton, Tooltip } from "@mui/material";
import { PanelLeftClose, PanelLeftOpen } from "lucide-react";
import { NewPartButton } from "../components/NewPart/NewPartButton";
import { PartView } from "../components/PartView/PartView";
import { PartsTree } from "../components/Sidebar/PartsTree";
import { SearchField } from "../components/Sidebar/SearchField";

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
};

/** Layout only: collapsible sidebar on the left, selected part on the right. */
export function PartsPage() {
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
          <>
            <Box sx={pageStyles.search}>
              <Box sx={pageStyles.searchField}>
                <SearchField />
              </Box>
              <NewPartButton />
              <Tooltip title="Hide sidebar">
                <IconButton aria-label="Hide sidebar" onClick={toggle}>
                  <PanelLeftClose size={20} />
                </IconButton>
              </Tooltip>
            </Box>
            <Box sx={pageStyles.treeScroll}>
              <PartsTree />
            </Box>
          </>
        )}
      </Drawer>
      <Box sx={pageStyles.content}>
        <PartView />
      </Box>
    </Box>
  );
}
