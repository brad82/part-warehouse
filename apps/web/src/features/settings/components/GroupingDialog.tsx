import { useState } from "react";
import {
  Alert,
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  TextField,
} from "@mui/material";
import {
  GROUPING_ID_PATTERNS,
  type Grouping,
  type Taxonomy,
} from "@snowcat/shared";
import { codePrefix } from "../model/nextGroupingId";
import { TAXONOMY_LABELS } from "../model/taxonomy";

type Props = {
  taxonomy: Taxonomy;
  parentId: string | null;
  /** Set when renaming; the code is then fixed. */
  grouping: Grouping | null;
  /** Prefilled code for a new grouping. */
  suggestedId: string;
  onSave: (input: { id: string; name: string }) => Promise<void>;
  onClose: () => void;
};

const EXAMPLES: Record<Taxonomy, string> = {
  module: "One letter, e.g. B",
  subassembly: "Two digits, e.g. A07",
  group: "Three digits, e.g. A01-005",
};

/** Add a module / sub-assembly / group, or rename one. */
export function GroupingDialog({
  taxonomy,
  parentId,
  grouping,
  suggestedId,
  onSave,
  onClose,
}: Props) {
  const [id, setId] = useState(grouping?.id ?? suggestedId);
  const [name, setName] = useState(grouping?.name ?? "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const prefix = codePrefix(taxonomy, parentId);
  const idValid =
    !!grouping ||
    (GROUPING_ID_PATTERNS[taxonomy].test(id) && id.startsWith(prefix));
  const valid = idValid && name.trim() !== "";
  const label = TAXONOMY_LABELS[taxonomy];

  return (
    <Dialog open onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle>
        {grouping ? `Rename ${grouping.id}` : `New ${label.toLowerCase()}`}
      </DialogTitle>
      <Box
        component="form"
        noValidate
        onSubmit={async (e) => {
          e.preventDefault();
          if (!valid) return;
          setBusy(true);
          try {
            await onSave({ id, name: name.trim() });
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
          <TextField
            fullWidth
            size="small"
            label="Code"
            value={id}
            disabled={!!grouping}
            error={!idValid}
            helperText={
              grouping
                ? "Codes are fixed once parts use them"
                : idValid
                  ? "Next free code. Change it to keep numbers matching across modules"
                  : `${EXAMPLES[taxonomy]}${prefix ? `, starting ${prefix}` : ""}`
            }
            onChange={(e) => setId(e.target.value.trim().toUpperCase())}
            slotProps={{
              htmlInput: {
                style: {
                  fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
                },
              },
            }}
            sx={{ mt: 1 }}
          />
          <TextField
            autoFocus
            fullWidth
            size="small"
            label="Name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            sx={{ mt: 2 }}
          />
        </DialogContent>
        <DialogActions>
          <Button variant="text" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" disabled={!valid} loading={busy}>
            Save
          </Button>
        </DialogActions>
      </Box>
    </Dialog>
  );
}
