import { Alert, Box, CircularProgress, Grid, Link, Typography } from "@mui/material";
import { Boxes } from "lucide-react";
import { Link as RouterLink } from "react-router-dom";
import { ATTR, attrText } from "@snowcat/shared";
import { useSelectedPart } from "../../PartsProvider";
import { PartFields } from "./PartFields";
import { PartHeader } from "./PartHeader";
import { StlViewer } from "./StlViewer";
import { StockStrip } from "./StockStrip";

const viewStyles = {
  root: { p: { xs: 2, md: 3 } },
  empty: {
    height: "100%",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    gap: 1,
    color: "text.secondary",
  },
  viewer: { position: { md: "sticky" }, top: { md: 24 } },
};

/** Dispatches between empty / loading / error / the part itself. */
export function PartView() {
  const { part, code, loading, error, previewColours } = useSelectedPart();

  if (!code) {
    return (
      <Box sx={viewStyles.empty}>
        <Boxes size={40} />
        <Typography>Pick a part from the tree, search, or scan a label.</Typography>
        <Link component={RouterLink} to="/bom" variant="body2">
          Or browse the full bill of materials
        </Link>
      </Box>
    );
  }
  if (loading) return <CircularProgress sx={{ m: 3 }} />;
  if (error || !part) {
    return (
      <Box sx={viewStyles.root}>
        <Alert severity="error">
          {error ?? "Part not found"}: {code}
        </Alert>
      </Box>
    );
  }

  // Only parts with a model file (printed ones) get the viewer.
  const hasModel = attrText(part, ATTR.filePath) != null;
  return (
    <Box sx={viewStyles.root}>
      <PartHeader />
      <StockStrip />
      <Grid container spacing={3}>
        <Grid size={{ xs: 12, lg: 6 }}>
          <PartFields />
        </Grid>
        {hasModel ? (
          <Grid size={{ xs: 12, lg: 6 }}>
            <Box sx={viewStyles.viewer}>
              <StlViewer
                code={part.code}
                colour={attrText(part, ATTR.colour) ?? ""}
                colours={previewColours}
              />
            </Box>
          </Grid>
        ) : null}
      </Grid>
    </Box>
  );
}
