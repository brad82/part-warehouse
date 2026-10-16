import { Alert, Button, Snackbar } from "@mui/material";
import { errorMessage } from "@shared/api/errors";
import { useOpenInSlicerMutation } from "../../api/partsApi";
import { PrusaSlicerIcon } from "./PrusaSlicerIcon";

/** Asks the local API to launch PrusaSlicer with the part's STL. */
export function OpenInSlicerButton({ code }: { code: string }) {
  const [openInSlicer, { isLoading, error, reset }] = useOpenInSlicerMutation();
  const message = errorMessage(error, "Couldn't open PrusaSlicer.");
  return (
    <>
      <Button
        variant="outlined"
        startIcon={<PrusaSlicerIcon />}
        disabled={isLoading}
        onClick={() => openInSlicer(code)}
      >
        Open in PrusaSlicer
      </Button>
      <Snackbar open={message != null} autoHideDuration={5000} onClose={reset}>
        <Alert severity="error" onClose={reset}>
          {message}
        </Alert>
      </Snackbar>
    </>
  );
}
