import { useState } from "react";
import {
  Box,
  Breadcrumbs,
  Chip,
  IconButton,
  Link,
  Tooltip,
  Typography,
} from "@mui/material";
import { Pencil, Table2 } from "lucide-react";
import { Link as RouterLink } from "react-router-dom";
import { ATTR, attrText } from "@parts-warehouse/shared";
import { PrintLabelButton } from "@features/labels";
import { ancestorIds } from "@shared/lib/groupings";
import { useRenamePart, useSelectedPart } from "../../PartsProvider";
import { OpenInSlicerButton } from "./OpenInSlicerButton";
import { RenamePartDialog } from "./RenamePartDialog";

const headerStyles = {
  root: {
    display: "flex",
    flexDirection: { xs: "column", sm: "row" },
    alignItems: { xs: "stretch", sm: "flex-start" },
    gap: 2,
    mb: 3,
  },
  titles: { flex: 1, minWidth: 0 },
  actions: {
    display: "flex",
    flexWrap: "wrap",
    justifyContent: { xs: "flex-start", sm: "flex-end" },
    gap: 1,
  },
  crumb: {
    display: "flex",
    alignItems: "center",
    color: "text.secondary",
    "&:hover": { color: "primary.main" },
  },
  code: { fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace" },
  title: { display: "flex", alignItems: "center", gap: 0.5 },
  name: { fontSize: { xs: "1.5rem", sm: "2rem" }, minWidth: 0 },
  rename: { color: "text.secondary", flexShrink: 0 },
};

export function PartHeader() {
  const { part, groupings } = useSelectedPart();
  const { rename } = useRenamePart();
  const [renaming, setRenaming] = useState(false);
  if (!part) return null;

  const byId = new Map(groupings.map((g) => [g.id, g]));
  const path = ancestorIds(groupings, part)
    .reverse()
    .map((id) => byId.get(id)!);

  return (
    <Box sx={headerStyles.root}>
      <Box sx={headerStyles.titles}>
        <Breadcrumbs sx={{ fontSize: "0.85rem" }}>
          <Tooltip title="Bill of Materials">
            <Link
              component={RouterLink}
              to="/bom"
              aria-label="Bill of Materials"
              sx={headerStyles.crumb}
            >
              <Table2 size={16} />
            </Link>
          </Tooltip>
          {path.map((g) => (
            <Link
              key={g.id}
              component={RouterLink}
              to={`/bom?group=${encodeURIComponent(g.id)}`}
              variant="body2"
              underline="hover"
              sx={headerStyles.crumb}
            >
              {g.id} {g.name}
            </Link>
          ))}
        </Breadcrumbs>
        <Box sx={headerStyles.title}>
          <Typography variant="h1" component="h2" sx={headerStyles.name}>
            {part.name}
          </Typography>
          <Tooltip title="Rename">
            <IconButton
              size="small"
              aria-label="Rename part"
              sx={headerStyles.rename}
              onClick={() => setRenaming(true)}
            >
              <Pencil size={18} />
            </IconButton>
          </Tooltip>
        </Box>
        <Box sx={{ display: "flex", gap: 1, mt: 1, alignItems: "center" }}>
          <Typography sx={headerStyles.code}>{part.code}</Typography>
          <Chip
            size="small"
            label={part.status === "completed" ? "Completed" : "Planned"}
            color={part.status === "completed" ? "success" : "default"}
          />
        </Box>
      </Box>
      <Box sx={headerStyles.actions}>
        {attrText(part, ATTR.filePath) != null ? (
          <OpenInSlicerButton code={part.code} />
        ) : null}
        <PrintLabelButton part={part} />
      </Box>
      {renaming ? (
        <RenamePartDialog
          name={part.name}
          onSave={rename}
          onClose={() => setRenaming(false)}
        />
      ) : null}
    </Box>
  );
}
