import {
  Alert,
  Box,
  Button,
  Divider,
  Grid,
  MenuItem,
  Paper,
  TextField,
  Typography,
  type TextFieldProps,
} from "@mui/material";
import { Save, Undo2 } from "lucide-react";
import { ATTR, type AttributeDef } from "@parts-warehouse/shared";
import { attrErrorKey, type CoreField } from "../../model/usePartDraft";
import { usePartForm } from "../../PartsProvider";
import { AttributeField } from "./AttributeField";

const fieldStyles = {
  paper: { p: 2.5 },
  section: { mt: 3, mb: 1.5 },
  actions: { display: "flex", gap: 1, justifyContent: "flex-end", mt: 3 },
};

/** Long values get a full-width row; the rest pair up. */
const WIDE: AttributeDef["dataType"][] = ["url"];
const attributeSize = (def: AttributeDef) =>
  WIDE.includes(def.dataType) || def.key === ATTR.filePath ? 12 : { xs: 12, sm: 6 };

/**
 * Left column: part fields and its type's attributes, then Save. Name and
 * stock save on their own (header rename, stock strip).
 */
export function PartFields() {
  const {
    part,
    values,
    dirty,
    fieldErrors,
    saving,
    saveError,
    partTypes,
    defs,
    setField,
    setAttribute,
    submit,
    reset,
  } = usePartForm();
  if (!part || !values) return null;

  const field = (key: CoreField, label: string, props: TextFieldProps = {}) => (
    <TextField
      fullWidth
      size="small"
      label={label}
      value={values[key]}
      error={!!fieldErrors[key]}
      helperText={fieldErrors[key] ?? " "}
      onChange={(e) => setField(key, e.target.value as never)}
      {...props}
    />
  );
  const numberField = (key: CoreField, label: string) =>
    field(key, label, {
      type: "number",
      slotProps: { htmlInput: { min: 0, step: "1" } },
    });

  return (
    <Paper
      variant="outlined"
      sx={fieldStyles.paper}
      component="form"
      // Our validation shows field messages; the browser's would block submit.
      noValidate
      onSubmit={(e) => {
        e.preventDefault();
        void submit();
      }}
    >
      {saveError ? (
        <Alert severity="error" sx={{ mb: 2 }}>
          {saveError}
        </Alert>
      ) : null}

      <Typography variant="h3">Part</Typography>
      <Grid container spacing={1.5} sx={{ mt: 1.5 }}>
        <Grid size={{ xs: 12, sm: 4 }}>
          {field("partTypeId", "Type", {
            select: true,
            children: partTypes.map((t) => (
              <MenuItem key={t.id} value={t.id}>
                {t.name}
              </MenuItem>
            )),
          })}
        </Grid>
        <Grid size={{ xs: 6, sm: 4 }}>{numberField("qtyPerBuild", "Qty per build")}</Grid>
        <Grid size={{ xs: 6, sm: 4 }}>{numberField("revision", "Revision")}</Grid>
        <Grid size={12}>{field("notes", "Notes", { multiline: true, minRows: 2 })}</Grid>
      </Grid>

      {defs.length > 0 ? (
        <>
          <Divider sx={fieldStyles.section} />
          <Typography variant="h3">Attributes</Typography>
          <Grid container spacing={1.5} sx={{ mt: 1.5 }}>
            {defs.map((def) => (
              <Grid key={def.key} size={attributeSize(def)}>
                <AttributeField
                  def={def}
                  value={values.attributes[def.key] ?? ""}
                  error={fieldErrors[attrErrorKey(def.key)]}
                  onChange={(v) => setAttribute(def.key, v)}
                />
              </Grid>
            ))}
          </Grid>
        </>
      ) : null}

      <Box sx={fieldStyles.actions}>
        <Button
          variant="text"
          startIcon={<Undo2 size={16} />}
          disabled={!dirty || saving}
          onClick={reset}
        >
          Discard changes
        </Button>
        <Button
          type="submit"
          startIcon={<Save size={16} />}
          disabled={!dirty}
          loading={saving}
        >
          Save
        </Button>
      </Box>
    </Paper>
  );
}
