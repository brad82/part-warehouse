import {
  Alert,
  Box,
  Button,
  Checkbox,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControlLabel,
  LinearProgress,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from "@mui/material";
import { Printer } from "lucide-react";
import type { Part } from "@parts-warehouse/shared";
import { errorMessage } from "@shared/api/errors";
import { useListLabelTemplatesQuery } from "../api/labelTemplatesApi";
import { useLabelPrint, usesRender } from "../model/useLabelPrint";
import { PrintPortal } from "./PrintPortal";
import { TemplateLabel } from "./Templates/TemplateLabel";

type Props = { part: Part; open: boolean; onClose: () => void };

const EMPTY: never[] = [];

const dialogStyles = {
  controls: { display: "flex", gap: 2, alignItems: "center", flexWrap: "wrap" },
  previewWrap: {
    mt: 2,
    p: 3,
    bgcolor: "action.hover",
    borderRadius: 1,
    display: "flex",
    justifyContent: "center",
  },
  // Preview at 1.5× real size so it is readable on screen.
  preview: { zoom: 1.5, boxShadow: 3, display: "flex" },
};

/** Pick a label template (from the API), copies and render; preview; print. */
export function LabelDialog({ part, open, onClose }: Props) {
  const templates = useListLabelTemplatesQuery();
  const label = useLabelPrint(part, open, templates.data ?? EMPTY);
  const { template } = label;
  const error = errorMessage(templates.error, "Couldn't load label templates.");

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Print label · {part.code}</DialogTitle>
      <DialogContent>
        {error ? <Alert severity="error">{error}</Alert> : null}
        {templates.isLoading ? <LinearProgress /> : null}
        {templates.isSuccess && !template ? (
          <Alert severity="info">
            No label templates. Make one in Settings → Label templates.
          </Alert>
        ) : null}
        {template ? (
          <>
            <Box sx={dialogStyles.controls}>
              <ToggleButtonGroup
                exclusive
                sx={{ flexWrap: "wrap" }}
                size="small"
                value={template.id}
                onChange={(_e, id: string | null) =>
                  id && label.setTemplateId(id)
                }
              >
                {templates.data?.map((t) => (
                  <ToggleButton key={t.id} value={t.id}>
                    {t.name}
                  </ToggleButton>
                ))}
              </ToggleButtonGroup>
              <TextField
                size="small"
                type="number"
                label="Copies"
                value={label.copies}
                onChange={(e) => label.setCopies(Number(e.target.value))}
                sx={{ width: 96 }}
                slotProps={{ htmlInput: { min: 1, max: 50 } }}
              />
              {usesRender(template) ? (
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={label.includeRender}
                      onChange={(e) => label.setIncludeRender(e.target.checked)}
                    />
                  }
                  label="Part render / image"
                />
              ) : null}
            </Box>
            <Typography
              variant="caption"
              color="text.secondary"
              component="p"
              sx={{ mt: 1 }}
            >
              {template.description ??
                `${template.widthMm}×${template.heightMm}mm`}
            </Typography>
            {label.rendering ? <LinearProgress sx={{ mt: 1 }} /> : null}
            <Box sx={dialogStyles.previewWrap}>
              <Box sx={dialogStyles.preview}>
                <TemplateLabel
                  part={part}
                  template={template}
                  render={label.render}
                />
              </Box>
            </Box>
          </>
        ) : null}
      </DialogContent>
      <DialogActions>
        <Button variant="text" onClick={onClose}>
          Close
        </Button>
        <Button
          startIcon={<Printer size={16} />}
          onClick={label.print}
          disabled={!template || label.rendering}
        >
          Print
        </Button>
      </DialogActions>
      {label.printing && template ? (
        <PrintPortal
          part={part}
          template={template}
          render={label.render}
          copies={label.copies}
        />
      ) : null}
    </Dialog>
  );
}
