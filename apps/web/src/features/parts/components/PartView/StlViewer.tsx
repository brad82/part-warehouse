import { useEffect, useState } from "react";
import { Alert, Box, CircularProgress, Link, Paper, Typography, useTheme } from "@mui/material";
import { Canvas } from "@react-three/fiber";
import { Bounds, OrbitControls } from "@react-three/drei";
import { FileX } from "lucide-react";
import { Link as RouterLink } from "react-router-dom";
import type { BufferGeometry } from "three";
import type { PreviewColour } from "@parts-warehouse/shared";
import { StlNotFoundError, fetchStlGeometry } from "@shared/lib/stl";
import { useModelColour } from "../../model/useModelColour";
import {
  VIEWER_BACKGROUNDS,
  useViewerAppearance,
} from "../../model/useViewerAppearance";
import { previewFrameSx } from "./previewFrame";
import { ViewerGrid, useGridMetrics } from "./ViewerGrid";
import { ViewerToolbar } from "./ViewerToolbar";

type Props = {
  code: string;
  /** The part's colour attribute ("" if unset). */
  colour: string;
  /** Colours the viewer offers (Settings → STL Preview). */
  colours: PreviewColour[];
};

type LoadState =
  | { status: "loading" }
  | { status: "ready"; geometry: BufferGeometry }
  | { status: "error"; message: string };

const viewerStyles = {
  paper: previewFrameSx,
  overlay: {
    position: "absolute",
    inset: 0,
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    gap: 1,
    color: "text.secondary",
  },
  hint: {
    position: "absolute",
    bottom: 8,
    left: 12,
    color: "text.secondary",
    pointerEvents: "none",
  },
  mismatch: {
    position: "absolute",
    left: 8,
    bottom: 32,
    zIndex: 1,
    maxWidth: "calc(100% - 16px)",
    py: 0,
    px: 1,
    typography: "caption",
    boxShadow: 1,
    "& .MuiAlert-icon": { py: 0.75, mr: 1 },
    "& .MuiAlert-message": { py: 0.75 },
    "& .MuiAlert-action": { py: 0, mr: -0.5 },
  },
};

function useStlGeometry(code: string): LoadState {
  const [state, setState] = useState<LoadState>({ status: "loading" });
  useEffect(() => {
    const controller = new AbortController();
    let geometry: BufferGeometry | undefined;
    setState({ status: "loading" });
    fetchStlGeometry(code, controller.signal)
      .then((g) => {
        geometry = g;
        setState({ status: "ready", geometry: g });
      })
      .catch((e: unknown) => {
        if (controller.signal.aborted) return;
        setState({
          status: "error",
          message: e instanceof StlNotFoundError ? "No STL file" : "Couldn't load STL",
        });
      });
    return () => {
      controller.abort();
      geometry?.dispose();
    };
  }, [code]);
  return state;
}

function GridScale({ geometry }: { geometry: BufferGeometry }) {
  const { cell } = useGridMetrics(geometry);
  return (
    <>
      Grid {cell} mm (bold every {cell * 10} mm) ·{" "}
      <Box component="span" sx={{ color: "#e5484d" }}>X</Box>{" "}
      <Box component="span" sx={{ color: "#30a46c" }}>Y</Box>{" "}
      <Box component="span" sx={{ color: "#3e8ef7" }}>Z</Box> ·{" "}
    </>
  );
}

/** Right column: orbitable preview of the part's STL. */
export function StlViewer({ code, colour, colours }: Props) {
  const state = useStlGeometry(code);
  const theme = useTheme();
  const appearance = useViewerAppearance();
  const background =
    appearance.background === "theme"
      ? theme.palette.background.paper
      : VIEWER_BACKGROUNDS[appearance.background];
  const modelColour = useModelColour(code, colour, colours);
  const darkBackground =
    appearance.background === "dark" ||
    (appearance.background === "theme" && theme.palette.mode === "dark");

  return (
    <Paper variant="outlined" sx={viewerStyles.paper}>
      {state.status === "ready" ? (
        <>
          <ViewerToolbar appearance={appearance} modelColour={modelColour} colours={colours} />
          {modelColour.mismatch ? (
            <Alert
              severity="info"
              variant="outlined"
              onClose={modelColour.dismissMismatch}
              sx={{ ...viewerStyles.mismatch, bgcolor: "background.paper" }}
            >
              No preview colour for “{modelColour.mismatch.partColour}”. Showing{" "}
              {modelColour.mismatch.shownAs}.{" "}
              <Link component={RouterLink} to="/settings/stl-preview">
                Add it
              </Link>
            </Alert>
          ) : null}
          <Canvas camera={{ position: [1, 0.8, 1], fov: 40 }} dpr={[1, 2]}>
            <color attach="background" args={[background]} />
            <ambientLight intensity={0.6} />
            <directionalLight position={[5, 10, 7]} intensity={1.6} />
            <directionalLight position={[-6, -4, -5]} intensity={0.5} />
            <Bounds key={code} fit clip observe margin={1.3}>
              <mesh geometry={state.geometry}>
                <meshStandardMaterial
                  color={modelColour.hex}
                  roughness={0.55}
                  metalness={0.05}
                />
              </mesh>
            </Bounds>
            {appearance.grid ? (
              <ViewerGrid geometry={state.geometry} dark={darkBackground} />
            ) : null}
            <OrbitControls makeDefault />
          </Canvas>
          <Typography
            variant="caption"
            sx={{
              ...viewerStyles.hint,
              color: appearance.background === "theme"
                ? "text.secondary"
                : appearance.background === "dark"
                  ? "grey.500"
                  : "grey.700",
            }}
          >
            {appearance.grid ? (
              <GridScale geometry={state.geometry} />
            ) : null}
            Drag to rotate · scroll to zoom · right-drag to pan
          </Typography>
        </>
      ) : (
        <Box sx={viewerStyles.overlay}>
          {state.status === "loading" ? (
            <CircularProgress size={28} />
          ) : (
            <>
              <FileX size={32} />
              <Typography>{state.message}</Typography>
            </>
          )}
        </Box>
      )}
    </Paper>
  );
}
