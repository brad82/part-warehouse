import {
  Alert,
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Grid,
  ListSubheader,
  MenuItem,
  TextField,
  Typography,
  type TextFieldProps,
} from "@mui/material";
import type { Grouping, PartCreate, PartType } from "@parts-warehouse/shared";
import { useNewPart, type NewPartValues } from "../../model/useNewPart";

type Props = {
  open: boolean;
  onClose: () => void;
  groupings: Grouping[];
  partTypes: PartType[];
  defaultGroupId: string | undefined;
  nextPartNumber: (groupId: string) => Promise<string | null>;
  /** Resolves to the new part's code. */
  onCreate: (input: PartCreate) => Promise<string>;
  creating: boolean;
  createError: string | null;
  onCreated: (code: string) => void;
};

const dialogStyles = {
  code: {
    mt: 0.5,
    p: 1.5,
    borderRadius: 1,
    bgcolor: "action.hover",
    fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
    fontWeight: 700,
  },
};

/** Adds a part (printed or purchased) to an existing parts group. */
export function NewPartDialog({
  open,
  onClose,
  groupings,
  partTypes,
  defaultGroupId,
  nextPartNumber,
  onCreate,
  creating,
  createError,
  onCreated,
}: Props) {
  const form = useNewPart({
    groupings,
    partTypes,
    defaultGroupId,
    nextPartNumber,
    onCreate,
    onCreated,
  });

  const field = (
    key: keyof NewPartValues,
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
      onChange={(e) => form.setField(key, e.target.value)}
      {...props}
    />
  );

  // Sub-assembly headings between their groups.
  const groupItems = form.groups.flatMap(({ group, subassembly }, i) => {
    const heading =
      subassembly && form.groups[i - 1]?.subassembly?.id !== subassembly.id ? (
        <ListSubheader key={`h-${subassembly.id}`}>
          {subassembly.id} {subassembly.name}
        </ListSubheader>
      ) : null;
    return [
      heading,
      <MenuItem key={group.id} value={group.id}>
        {group.id} {group.name}
      </MenuItem>,
    ];
  });

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>New part</DialogTitle>
      <Box
        component="form"
        // Our validation shows field messages; the browser's would block submit.
        noValidate
        onSubmit={(e) => {
          e.preventDefault();
          void form.submit();
        }}
      >
        <DialogContent>
          {createError ? (
            <Alert severity="error" sx={{ mb: 2 }}>
              {createError}
            </Alert>
          ) : null}
          <Grid container spacing={1.5} sx={{ mt: 0.5 }}>
            <Grid size={12}>
              {field("groupId", "Parts group", {
                select: true,
                children: groupItems,
              })}
            </Grid>
            <Grid size={{ xs: 6, sm: 3 }}>
              {field("part", "Part no.", {
                helperText:
                  form.fieldErrors.part ??
                  (form.groupFull ? "Group is full (99 parts)" : " "),
              })}
            </Grid>
            <Grid size={{ xs: 6, sm: 3 }}>
              {field("revision", "Revision", {
                type: "number",
                slotProps: { htmlInput: { min: 0, max: 9, step: 1 } },
              })}
            </Grid>
            <Grid size={{ xs: 6, sm: 3 }}>
              {field("partTypeId", "Type", {
                select: true,
                children: partTypes.map((t) => (
                  <MenuItem key={t.id} value={t.id}>
                    {t.name}
                  </MenuItem>
                )),
              })}
            </Grid>
            <Grid size={{ xs: 6, sm: 3 }}>
              {field("qtyPerBuild", "Qty per build", {
                type: "number",
                slotProps: { htmlInput: { min: 0, step: 1 } },
              })}
            </Grid>
            <Grid size={12}>{field("name", "Part name")}</Grid>
          </Grid>
          <Typography variant="caption" color="text.secondary">
            Code
          </Typography>
          <Box sx={dialogStyles.code}>{form.code ?? "–"}</Box>
        </DialogContent>
        <DialogActions>
          <Button variant="text" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" loading={creating}>
            Create
          </Button>
        </DialogActions>
      </Box>
    </Dialog>
  );
}
