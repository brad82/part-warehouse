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
import { ATTR, parseAttributeValue, type AttributeDef, type PartStatus } from "@snowcat/shared";
import { formatMinutes, partTotals } from "../../model/totals";
import { attrErrorKey, type CoreField } from "../../model/usePartDraft";
import { usePartForm } from "../../PartsProvider";
import { AttributeField } from "./AttributeField";

const fieldStyles = {
  paper: { p: 2.5 },
  section: { mt: 3, mb: 1.5 },
  totals: {
    display: "grid",
    gridTemplateColumns: "repeat(3, 1fr)",
    gap: 1,
    mt: 2,
    p: 1.5,
    borderRadius: 1,
    bgcolor: "action.hover",
  },
  actions: { display: "flex", gap: 1, justifyContent: "flex-end", mt: 3 },
};

function Total({ label, value }: { label: string; value: string }) {
  return (
    <Box>
      <Typography variant="caption" color="text.secondary">
        {label}
      </Typography>
      <Typography fontWeight={600}>{value}</Typography>
    </Box>
  );
}

/** Long values get a full-width row; the rest pair up. */
const WIDE: AttributeDef["dataType"][] = ["url"];
const attributeSize = (def: AttributeDef) =>
  WIDE.includes(def.dataType) || def.key === ATTR.filePath ? 12 : { xs: 12, sm: 6 };

/** Left column: part fields, its type's attributes, stock, then Save. */
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

  // Totals use the typed values when they parse; a half-typed one counts as unset.
  const typedNumber = (key: string) => {
    const def = defs.find((d) => d.key === key);
    const raw = values.attributes[key] ?? "";
    if (!def || raw.trim() === "") return [];
    const parsed = parseAttributeValue(def, raw);
    return parsed.ok ? [[key, parsed.value] as const] : [];
  };
  const totals = partTotals({
    qtyPerBuild: Number(values.qtyPerBuild) || 0,
    onHand: Number(values.onHand) || 0,
    attributes: Object.fromEntries([
      ...typedNumber(ATTR.printTimeMin),
      ...typedNumber(ATTR.filamentG),
    ]),
  });
  const shows = (key: string) => defs.some((d) => d.key === key);
  const isPrinted = shows(ATTR.printTimeMin) || shows(ATTR.filePath);

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
        <Grid size={12}>{field("name", "Part name")}</Grid>
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

      <Divider sx={fieldStyles.section} />
      <Typography variant="h3">Stock</Typography>
      <Grid container spacing={1.5} sx={{ mt: 1.5 }}>
        <Grid size={{ xs: 6 }}>{numberField("onHand", "On hand")}</Grid>
        <Grid size={{ xs: 6 }}>
          {field("status", "Status", {
            select: true,
            onChange: (e) => setField("status", e.target.value as PartStatus),
            children: [
              <MenuItem key="planned" value="planned">
                Planned
              </MenuItem>,
              <MenuItem key="completed" value="completed">
                Completed
              </MenuItem>,
            ],
          })}
        </Grid>
      </Grid>
      <Box sx={fieldStyles.totals}>
        <Total
          label={isPrinted ? "Still to print" : "Still needed"}
          value={String(totals.remaining)}
        />
        {shows(ATTR.printTimeMin) ? (
          <Total label="Time per build" value={formatMinutes(totals.printTimeMin)} />
        ) : null}
        {shows(ATTR.filamentG) ? (
          <Total
            label="Filament per build"
            value={totals.filamentG == null ? "–" : `${totals.filamentG.toFixed(0)} g`}
          />
        ) : null}
      </Box>

      <Box sx={fieldStyles.actions}>
        <Button
          variant="text"
          startIcon={<Undo2 size={16} />}
          disabled={!dirty || saving}
          onClick={reset}
        >
          Discard
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
