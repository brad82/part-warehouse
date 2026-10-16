import { useState } from "react";
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
  FormGroup,
  FormLabel,
  Grid,
  MenuItem,
  TextField,
  type TextFieldProps,
} from "@mui/material";
import type { AttributeDef, AttributeDefCreate, PartType } from "@snowcat/shared";
import { useAttributeForm, type AttributeFormValues } from "../model/useAttributeForm";
import { DATA_TYPE_LABELS } from "../model/dataTypes";

type Props = {
  def: AttributeDef | null;
  partTypes: PartType[];
  onSave: (input: AttributeDefCreate) => Promise<void>;
  onClose: () => void;
};

/** Add or edit an attribute definition. Built-in ones keep key and type. */
export function AttributeDialog({ def, partTypes, onSave, onClose }: Props) {
  const form = useAttributeForm(def);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const locked = def?.system ?? false;

  const field = (
    key: Exclude<keyof AttributeFormValues, "partTypeIds">,
    label: string,
    props: TextFieldProps = {},
  ) => (
    <TextField
      fullWidth
      size="small"
      label={label}
      value={form.values[key]}
      error={!!form.fieldErrors[key]}
      helperText={form.fieldErrors[key] ?? " "}
      onChange={(e) => form.setField(key, e.target.value as never)}
      {...props}
    />
  );

  return (
    <Dialog open onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>{def ? `Edit ${def.label}` : "New attribute"}</DialogTitle>
      <Box
        component="form"
        noValidate
        onSubmit={async (e) => {
          e.preventDefault();
          const input = form.result();
          if (!input) return;
          setBusy(true);
          try {
            await onSave(input);
            onClose();
          } catch (err) {
            setError((err as Error).message);
          } finally {
            setBusy(false);
          }
        }}
      >
        <DialogContent>
          {error ? (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          ) : null}
          {locked ? (
            <Alert severity="info" sx={{ mb: 2 }}>
              Built in: the app reads this attribute, so its key and type are fixed.
            </Alert>
          ) : null}
          <Grid container spacing={1.5} sx={{ mt: 0.5 }}>
            <Grid size={{ xs: 12, sm: 6 }}>{field("label", "Label", { autoFocus: true })}</Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              {field("key", "Key", {
                disabled: locked,
                helperText: form.fieldErrors.key ?? "Used in CSV export",
              })}
            </Grid>
            <Grid size={{ xs: 6, sm: 4 }}>
              {field("dataType", "Type", {
                select: true,
                disabled: locked,
                children: Object.entries(DATA_TYPE_LABELS).map(([value, label]) => (
                  <MenuItem key={value} value={value}>
                    {label}
                  </MenuItem>
                )),
              })}
            </Grid>
            <Grid size={{ xs: 6, sm: 4 }}>
              {field("unit", "Unit", { placeholder: "e.g. g, min, CAD" })}
            </Grid>
            <Grid size={{ xs: 6, sm: 4 }}>
              {field("sort", "Order", { type: "number" })}
            </Grid>
            {form.values.dataType === "select" ? (
              <Grid size={12}>
                {field("options", "Options", {
                  helperText: form.fieldErrors.options ?? "Comma-separated, e.g. PETG, TPU",
                })}
              </Grid>
            ) : null}
            <Grid size={12}>
              <FormLabel component="legend">Shown on</FormLabel>
              <FormGroup row>
                {partTypes.map((t) => (
                  <FormControlLabel
                    key={t.id}
                    label={t.name}
                    control={
                      <Checkbox
                        checked={form.values.partTypeIds.includes(t.id)}
                        onChange={() => form.togglePartType(t.id)}
                      />
                    }
                  />
                ))}
              </FormGroup>
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button variant="text" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" loading={busy}>
            Save
          </Button>
        </DialogActions>
      </Box>
    </Dialog>
  );
}
