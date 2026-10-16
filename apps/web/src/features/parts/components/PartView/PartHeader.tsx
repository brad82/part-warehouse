import { Box, Breadcrumbs, Chip, Typography } from "@mui/material";
import { ATTR, attrText } from "@snowcat/shared";
import { PrintLabelButton } from "@features/labels";
import { ancestorIds } from "../../model/buildTree";
import { useSelectedPart } from "../../PartsProvider";
import { OpenInSlicerButton } from "./OpenInSlicerButton";

const headerStyles = {
  root: { display: "flex", alignItems: "flex-start", gap: 2, mb: 3 },
  titles: { flex: 1, minWidth: 0 },
  actions: { display: "flex", flexWrap: "wrap", justifyContent: "flex-end", gap: 1 },
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
          {path.map((g) => (
            <Typography key={g.id} variant="body2" color="text.secondary">
              {g.id} {g.name}
            </Typography>
          ))}
        </Breadcrumbs>
        <Typography variant="h1" component="h2">
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
        {attrText(part, ATTR.filePath) != null ? <OpenInSlicerButton code={part.code} /> : null}
        <PrintLabelButton part={part} />
      </Box>
    </Box>
  );
}
