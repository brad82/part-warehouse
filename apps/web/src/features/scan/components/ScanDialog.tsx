import { useRef, useState, type KeyboardEvent } from "react";
import {
  Alert,
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  TextField,
  Typography,
} from "@mui/material";
import { CameraOff } from "lucide-react";
import { useCameraScanner } from "../model/useCameraScanner";
import { useScanLookup } from "../model/useScanLookup";

type Props = {
  open: boolean;
  onClose: () => void;
  lookup: (code: string) => Promise<boolean>;
  onFound: (code: string) => void;
};

const scanStyles = {
  video: {
    width: "100%",
    aspectRatio: "4 / 3",
    bgcolor: "common.black",
    borderRadius: 1,
    overflow: "hidden",
    position: "relative",
    "& video": { width: "100%", height: "100%", objectFit: "cover" },
  },
  noCamera: {
    position: "absolute",
    inset: 0,
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    gap: 1,
    color: "grey.400",
    textAlign: "center",
    p: 2,
  },
};

/**
 * Camera preview plus an always-focused text field. Handheld USB/Bluetooth
 * scanners (keyboard wedge, e.g. Zebra) type the code and press Enter, so
 * the field must hold focus from the moment the dialog opens and between
 * scans: it is focused once the open transition ends (MUI's focus trap
 * overrides plain `autoFocus`), never disabled, cleared after every submit,
 * and any keystroke landing elsewhere in the dialog is redirected to it.
 */
export function ScanDialog({ open, onClose, lookup, onFound }: Props) {
  const [text, setText] = useState("");
  const inputRef = useRef<HTMLInputElement | null>(null);
  const focusInput = () => inputRef.current?.focus();
  const scan = useScanLookup(lookup, (code) => {
    setText("");
    onFound(code);
  });
  const camera = useCameraScanner(open, (t) => void scan.handle(t));

  function submit() {
    const scanned = text;
    setText("");
    void scan.handle(scanned);
  }

  // A printable key or Enter outside the input (e.g. focus on the dialog
  // itself) goes to the input; focusing during keydown lets the character
  // land there.
  function redirectKeys(e: KeyboardEvent) {
    if (e.target === inputRef.current) return;
    if (e.key === "Escape" || e.key === "Tab") return;
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    if (e.key.length === 1 || e.key === "Enter") focusInput();
  }

  function close() {
    setText("");
    scan.clearError();
    onClose();
  }

  return (
    <Dialog
      open={open}
      onClose={close}
      fullWidth
      maxWidth="xs"
      onKeyDown={redirectKeys}
      slotProps={{ transition: { onEntered: focusInput } }}
    >
      <DialogTitle>Scan a part label</DialogTitle>
      <DialogContent>
        <Box sx={scanStyles.video}>
          <video ref={camera.videoRef} muted playsInline />
          {camera.state === "unavailable" ? (
            <Box sx={scanStyles.noCamera}>
              <CameraOff size={28} />
              <Typography variant="body2">
                No camera available. Use a handheld scanner or type the code.
              </Typography>
            </Box>
          ) : null}
        </Box>
        <Box
          component="form"
          sx={{ mt: 2 }}
          onSubmit={(e) => {
            e.preventDefault();
            submit();
          }}
        >
          <TextField
            autoFocus
            inputRef={inputRef}
            fullWidth
            size="small"
            label="Part code"
            placeholder="A01-001-001"
            value={text}
            onChange={(e) => setText(e.target.value)}
            slotProps={{ htmlInput: { autoComplete: "off", spellCheck: false } }}
            helperText="Handheld scanners type here automatically"
          />
        </Box>
        {scan.error ? (
          <Alert severity="warning" sx={{ mt: 1 }}>
            {scan.error}
          </Alert>
        ) : null}
      </DialogContent>
      <DialogActions>
        <Button variant="text" onClick={close}>
          Close
        </Button>
      </DialogActions>
    </Dialog>
  );
}
