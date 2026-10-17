import {
  Box,
  Breadcrumbs,
  Chip,
  Link,
  Tooltip,
  Typography,
} from "@mui/material";
import { Table2 } from "lucide-react";
import { Link as RouterLink } from "react-router-dom";
import { ATTR, attrText } from "@snowcat/shared";
import { PrintLabelButton } from "@features/labels";
import { ancestorIds } from "../../model/buildTree";
import { useSelectedPart } from "../../PartsProvider";
import { OpenInSlicerButton } from "./OpenInSlicerButton";

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
};

export function PartHeader() {
  const { part, groupings } = useSelectedPart();
  if (!part) return null;

  const byId = new Map(groupings.map((g) => [g.id, g]));
  const path = ancestorIds(groupings, part)
    .reverse()
    .map((id) => byId.get(id)!);

  return (
    <Box sx={headerStyles.root}>
      <Box sx={headerStyles.titles}>
        <Breadcrumbs sx={{ fontSize: "0.85rem" }}>
          <Tooltip title="Parts Catalog">
            <Link
              component={RouterLink}
              to="/catalog"
              aria-label="Parts Catalog"
              sx={headerStyles.crumb}
            >
              <Table2 size={16} />
            </Link>
          </Tooltip>
          {path.map((g) => (
            <Link
              key={g.id}
              component={RouterLink}
              to={`/catalog?group=${encodeURIComponent(g.id)}`}
              variant="body2"
              underline="hover"
              sx={headerStyles.crumb}
            >
              {g.id} {g.name}
            </Link>
          ))}
        </Breadcrumbs>
        <Typography
          variant="h1"
          component="h2"
          sx={{ fontSize: { xs: "1.5rem", sm: "2rem" } }}
        >
          {part.name}
        </Typography>
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
    </Box>
  );
}
