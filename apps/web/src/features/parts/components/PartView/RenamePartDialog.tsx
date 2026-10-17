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

type Props = {
  name: string;
  onSave: (name: string) => Promise<void>;
  onClose: () => void;
};

/** Renames a part on its own, without touching the edit form's draft. */
export function RenamePartDialog({ name: initial, onSave, onClose }: Props) {
  const [name, setName] = useState(initial);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const empty = name.trim() === "";

  return (
    <Dialog open onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle>Rename part</DialogTitle>
      <Box
        component="form"
        noValidate
        onSubmit={async (e) => {
          e.preventDefault();
          if (empty) return;
          if (name.trim() === initial) {
            onClose();
            return;
          }
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
            label="Part name"
            value={name}
            error={empty}
            helperText={empty ? "Enter a name" : " "}
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
