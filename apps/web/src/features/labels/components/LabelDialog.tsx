import {
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
import type { Part } from "@snowcat/shared";
import { useLabelPrint } from "../model/useLabelPrint";
import { LABEL_TEMPLATES, type LabelTemplate } from "../model/templates";
import { LabelFor } from "./LabelFor";
import { PrintPortal } from "./PrintPortal";

type Props = { part: Part; open: boolean; onClose: () => void };

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

export function LabelDialog({ part, open, onClose }: Props) {
  const label = useLabelPrint(part, open);

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Print label · {part.code}</DialogTitle>
      <DialogContent>
        <Box sx={dialogStyles.controls}>
          <ToggleButtonGroup
            exclusive
            size="small"
            value={label.template.id}
            onChange={(_e, id: LabelTemplate["id"] | null) => id && label.setTemplateId(id)}
          >
            {LABEL_TEMPLATES.map((t) => (
              <ToggleButton key={t.id} value={t.id}>
                {t.label}
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
          {label.template.supportsRender ? (
            <FormControlLabel
              control={
                <Checkbox
                  checked={label.includeRender}
                  onChange={(e) => label.setIncludeRender(e.target.checked)}
                />
              }
              label="3D render"
            />
          ) : null}
        </Box>
        <Typography variant="caption" color="text.secondary" component="p" sx={{ mt: 1 }}>
          {label.template.description}
        </Typography>
        {label.rendering ? <LinearProgress sx={{ mt: 1 }} /> : null}
        <Box sx={dialogStyles.previewWrap}>
          <Box sx={dialogStyles.preview}>
            <LabelFor part={part} template={label.template} render={label.render} />
          </Box>
        </Box>
      </DialogContent>
      <DialogActions>
        <Button variant="text" onClick={onClose}>
          Close
        </Button>
        <Button
          startIcon={<Printer size={16} />}
          onClick={label.print}
          disabled={label.rendering}
        >
          Print
        </Button>
      </DialogActions>
      {label.printing ? (
        <PrintPortal
          part={part}
          template={label.template}
          render={label.render}
          copies={label.copies}
        />
      ) : null}
    </Dialog>
  );
}
