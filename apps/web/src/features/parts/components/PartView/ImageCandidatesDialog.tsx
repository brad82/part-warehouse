import { useState } from "react";
import {
  Box,
  ButtonBase,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Button,
  Typography,
} from "@mui/material";
import { ImageOff } from "lucide-react";

type Props = {
  open: boolean;
  /** Image URLs the supplier page offered, best first. */
  candidates: string[];
  /** The one in use. */
  current: string | null;
  onClose: () => void;
  onSelect: (url: string) => Promise<void>;
};

const dialogStyles = {
  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill, minmax(128px, 1fr))",
    gap: 1.5,
  },
  tile: (selected: boolean) => ({
    position: "relative",
    aspectRatio: "1",
    width: "100%",
    borderRadius: 1,
    overflow: "hidden",
    border: 2,
    borderColor: selected ? "primary.main" : "divider",
    bgcolor: "#fff",
  }),
  // Square crop, as the stored image will be.
  thumb: { width: "100%", height: "100%", objectFit: "cover", display: "block" },
  overlay: {
    position: "absolute",
    inset: 0,
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    gap: 0.5,
    color: "text.secondary",
  },
};

/** Thumbnails of every scraped image; picking one makes it the part's image. */
export function ImageCandidatesDialog({ open, candidates, current, onClose, onSelect }: Props) {
  const [pending, setPending] = useState<string | null>(null);
  const [broken, setBroken] = useState<Set<string>>(new Set());

  async function choose(url: string) {
    setPending(url);
    try {
      await onSelect(url);
    } finally {
      setPending(null);
    }
  }

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Choose an image</DialogTitle>
      <DialogContent>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Images found on the supplier page. Each is cropped to a square.
        </Typography>
        <Box sx={dialogStyles.grid}>
          {candidates.map((url) => (
            <ButtonBase
              key={url}
              sx={dialogStyles.tile(url === current)}
              disabled={pending != null}
              aria-label={url === current ? "Current image" : "Use this image"}
              aria-pressed={url === current}
              onClick={() => void choose(url)}
            >
              {broken.has(url) ? (
                <Box sx={dialogStyles.overlay}>
                  <ImageOff size={20} />
                  <Typography variant="caption">No preview</Typography>
                </Box>
              ) : (
                <Box
                  component="img"
                  src={url}
                  alt=""
                  loading="lazy"
                  referrerPolicy="no-referrer"
                  sx={dialogStyles.thumb}
                  onError={() => setBroken((b) => new Set(b).add(url))}
                />
              )}
              {pending === url ? (
                <Box sx={{ ...dialogStyles.overlay, bgcolor: "rgba(255,255,255,0.7)" }}>
                  <CircularProgress size={24} />
                </Box>
              ) : null}
            </ButtonBase>
          ))}
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Close</Button>
      </DialogActions>
    </Dialog>
  );
}
