import { Box, Drawer } from "@mui/material";
import { NewPartButton } from "../components/NewPart/NewPartButton";
import { PartView } from "../components/PartView/PartView";
import { PartsTree } from "../components/Sidebar/PartsTree";
import { SearchField } from "../components/Sidebar/SearchField";

export const SIDEBAR_WIDTH = 340;

const pageStyles = {
  root: { display: "flex", flex: 1, minHeight: 0 },
  drawer: {
    width: SIDEBAR_WIDTH,
    flexShrink: 0,
    "& .MuiDrawer-paper": {
      width: SIDEBAR_WIDTH,
      position: "relative",
      display: "flex",
      flexDirection: "column",
    },
  },
  search: { display: "flex", alignItems: "center", pr: 1 },
  searchField: { flex: 1, minWidth: 0 },
  treeScroll: { flex: 1, overflowY: "auto", px: 1, pb: 2 },
  content: { flex: 1, minWidth: 0, overflow: "auto" },
};

/** Layout only: sidebar on the left, selected part on the right. */
export function PartsPage() {
  return (
    <Box sx={pageStyles.root}>
      <Drawer variant="permanent" sx={pageStyles.drawer}>
        <Box sx={pageStyles.search}>
          <Box sx={pageStyles.searchField}>
            <SearchField />
          </Box>
          <NewPartButton />
        </Box>
        <Box sx={pageStyles.treeScroll}>
          <PartsTree />
        </Box>
      </Drawer>
      <Box sx={pageStyles.content}>
        <PartView />
      </Box>
    </Box>
  );
}
