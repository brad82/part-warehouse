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
import type { PartType } from "@snowcat/shared";

type Props = {
  partType: PartType | null;
  onSave: (name: string) => Promise<void>;
  onClose: () => void;
};

/** Add a part type, or rename one. The id is derived from the first name. */
export function PartTypeDialog({ partType, onSave, onClose }: Props) {
  const [name, setName] = useState(partType?.name ?? "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const empty = name.trim() === "";

  return (
    <Dialog open onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle>{partType ? "Rename part type" : "New part type"}</DialogTitle>
      <Box
        component="form"
        noValidate
        onSubmit={async (e) => {
          e.preventDefault();
          if (empty) return;
          setBusy(true);
          try {
            await onSave(name.trim());
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
            autoFocus
            fullWidth
            size="small"
            label="Name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            sx={{ mt: 1 }}
          />
        </DialogContent>
        <DialogActions>
          <Button variant="text" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" disabled={empty} loading={busy}>
            Save
          </Button>
        </DialogActions>
      </Box>
    </Dialog>
  );
}
