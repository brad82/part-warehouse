import { Box, CircularProgress, Typography } from "@mui/material";
import { SimpleTreeView } from "@mui/x-tree-view/SimpleTreeView";
import { TreeItem } from "@mui/x-tree-view/TreeItem";
import type { TreeNode } from "../../model/buildTree";
import { usePartsSidebar } from "../../PartsProvider";

const treeStyles = {
  code: {
    fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
    fontSize: "0.75rem",
    color: "text.secondary",
    mr: 1,
  },
  label: { display: "flex", alignItems: "baseline", py: 0.25, minWidth: 0 },
  name: { overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" },
  empty: { p: 2, color: "text.secondary" },
};

function NodeLabel({ code, name }: { code: string; name: string }) {
  return (
    <Box sx={treeStyles.label}>
      <Box component="span" sx={treeStyles.code}>
        {code}
      </Box>
      <Box component="span" sx={treeStyles.name}>
        {name}
      </Box>
    </Box>
  );
}

function renderNode(node: TreeNode) {
  if (node.kind === "part") {
    return (
      <TreeItem
        key={node.id}
        itemId={node.id}
        label={<NodeLabel code={node.part.part} name={node.label} />}
      />
    );
  }
  // Show the last segment only: "A01", "001".
  const shortCode = node.id.split("-").pop() ?? node.id;
  return (
    <TreeItem
      key={node.id}
      itemId={node.id}
      label={<NodeLabel code={shortCode} name={node.label} />}
    >
      {node.children.map(renderNode)}
    </TreeItem>
  );
}

export function PartsTree() {
  const { tree, loading, search, expanded, setExpanded, selectedCode, onSelect } =
    usePartsSidebar();

  if (loading) return <CircularProgress size={24} sx={{ m: 2 }} />;
  if (tree.length === 0) {
    return (
      <Typography sx={treeStyles.empty}>
        {search ? "No parts match." : "No parts imported yet."}
      </Typography>
    );
  }

  return (
    <SimpleTreeView
      aria-label="Parts"
      expandedItems={expanded}
      onExpandedItemsChange={(_e, ids) => setExpanded(ids)}
      selectedItems={selectedCode ?? null}
      onSelectedItemsChange={(_e, id) => {
        // Grouping ids have fewer than three segments; only parts navigate.
        if (id && id.split("-").length === 3) onSelect(id);
      }}
    >
      {tree.map(renderNode)}
    </SimpleTreeView>
  );
}
