import { useEffect, useRef, useState, type DragEvent } from "react";
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  IconButton,
  Paper,
  Tooltip,
  Typography,
} from "@mui/material";
import { Globe, ImagePlus, Images, Trash2, Upload } from "lucide-react";
import { ATTR, attrText } from "@parts-warehouse/shared";
import { partImageUrl } from "@shared/lib/partImage";
import { usePartImage } from "../../PartsProvider";
import { ImageCandidatesDialog } from "./ImageCandidatesDialog";
import { previewFrameSx } from "./previewFrame";

const imageStyles = {
  paper: (dragging: boolean) => ({
    ...previewFrameSx,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    outline: dragging ? 2 : 0,
    outlineColor: "primary.main",
    outlineOffset: -2,
  }),
  image: {
    display: "block",
    maxWidth: "calc(100% - 32px)",
    maxHeight: "calc(100% - 32px)",
    aspectRatio: "1",
    objectFit: "contain",
    borderRadius: 1,
  },
  toolbar: {
    position: "absolute",
    top: 8,
    right: 8,
    zIndex: 1,
    display: "flex",
    gap: 0.5,
    p: 0.5,
    borderRadius: 1,
    bgcolor: "background.paper",
    boxShadow: 1,
  },
  empty: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: 1.5,
    px: 3,
    textAlign: "center",
    color: "text.secondary",
  },
  busy: {
    position: "absolute",
    inset: 0,
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    gap: 1,
    bgcolor: "background.paper",
    opacity: 0.85,
    zIndex: 2,
  },
  error: { position: "absolute", left: 8, right: 8, bottom: 8, zIndex: 3 },
};

const BUSY_LABEL = {
  uploading: "Uploading…",
  finding: "Finding an image on the supplier page… (up to 30 s)",
  choosing: "Fetching that image…",
  removing: "Removing…",
};

const imageFile = (files: FileList | null | undefined) =>
  [...(files ?? [])].find((f) => f.type.startsWith("image/"));

/**
 * The part's static image (bought parts have no CAD): upload, drop or paste
 * one, or pull it from the supplier link. Scraped images can be swapped
 * for another the page offered.
 */
export function ImagePreview() {
  const { part, canScrape, busy, error, clearError, upload, scrape, select, remove } =
    usePartImage();
  const [dragging, setDragging] = useState(false);
  const [choosing, setChoosing] = useState(false);
  const input = useRef<HTMLInputElement>(null);
  const image = part?.image ?? null;
  // Only with the image-scraper module installed.
  const supplierUrl = part && canScrape ? attrText(part, ATTR.supplierUrl) : null;

  // Paste an image anywhere on the page while there isn't one yet (not
  // while typing in a field, where paste means text).
  useEffect(() => {
    if (image) return;
    const onPaste = (e: ClipboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (target?.closest("input, textarea, [contenteditable=true]")) return;
      const file = imageFile(e.clipboardData?.files);
      if (file) {
        e.preventDefault();
        void upload(file);
      }
    };
    window.addEventListener("paste", onPaste);
    return () => window.removeEventListener("paste", onPaste);
  }, [image, upload]);

  if (!part) return null;

  const pickFile = () => input.current?.click();
  const onDrop = (e: DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const file = imageFile(e.dataTransfer.files);
    if (file) void upload(file);
  };

  return (
    <Paper
      variant="outlined"
      sx={imageStyles.paper(dragging)}
      onDragOver={(e) => {
        e.preventDefault();
        setDragging(true);
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={onDrop}
    >
      <input
        ref={input}
        type="file"
        accept="image/*"
        hidden
        onChange={(e) => {
          const file = imageFile(e.target.files);
          e.target.value = "";
          if (file) void upload(file);
        }}
      />

      {image ? (
        <>
          <Box sx={imageStyles.toolbar}>
            {canScrape && image.candidates.length > 1 ? (
              <Tooltip title="Choose another image">
                <IconButton size="small" aria-label="Choose another image" onClick={() => setChoosing(true)}>
                  <Images size={16} />
                </IconButton>
              </Tooltip>
            ) : null}
            {supplierUrl ? (
              <Tooltip title="Fetch again from supplier link">
                <IconButton size="small" aria-label="Fetch again from supplier link" onClick={() => void scrape()}>
                  <Globe size={16} />
                </IconButton>
              </Tooltip>
            ) : null}
            <Tooltip title="Upload a different image">
              <IconButton size="small" aria-label="Upload a different image" onClick={pickFile}>
                <Upload size={16} />
              </IconButton>
            </Tooltip>
            <Tooltip title="Remove image">
              <IconButton size="small" aria-label="Remove image" onClick={() => void remove()}>
                <Trash2 size={16} />
              </IconButton>
            </Tooltip>
          </Box>
          <Box
            component="img"
            src={partImageUrl(part.code, image)}
            alt={part.name}
            sx={imageStyles.image}
          />
        </>
      ) : (
        <Box sx={imageStyles.empty}>
          <ImagePlus size={32} />
          <Typography>No image yet. Drop, paste or upload one.</Typography>
          <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap", justifyContent: "center" }}>
            <Button variant="outlined" startIcon={<Upload size={16} />} onClick={pickFile}>
              Upload image
            </Button>
            {supplierUrl ? (
              <Button variant="outlined" startIcon={<Globe size={16} />} onClick={() => void scrape()}>
                Fetch from supplier link
              </Button>
            ) : null}
          </Box>
        </Box>
      )}

      {busy ? (
        <Box sx={imageStyles.busy}>
          <CircularProgress size={28} />
          <Typography variant="body2">{BUSY_LABEL[busy]}</Typography>
        </Box>
      ) : null}
      {error ? (
        <Alert severity="error" onClose={clearError} sx={imageStyles.error}>
          {error}
        </Alert>
      ) : null}

      {image && canScrape ? (
        <ImageCandidatesDialog
          open={choosing}
          candidates={image.candidates}
          current={image.sourceUrl}
          onClose={() => setChoosing(false)}
          onSelect={async (url) => {
            await select(url);
            setChoosing(false);
          }}
        />
      ) : null}
    </Paper>
  );
}
