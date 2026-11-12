import { useState } from "react";
import {
  Alert,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  MenuItem,
  Select,
  TextField,
} from "@mui/material";
import { alpha, type Theme } from "@mui/material/styles";
import { Plus } from "lucide-react";
import { useDispatch } from "react-redux";
import { useNavigate } from "react-router-dom";
import { baseApi } from "@shared/api/baseApi";
import {
  useCreateProjectMutation,
  useListProjectsQuery,
  useSwitchProjectMutation,
} from "../api/projectsApi";

const NEW = "__new__";

const switcherStyles = {
  select: {
    height: 36,
    maxWidth: { xs: 120, sm: 220 },
    borderRadius: "8px",
    fontWeight: 600,
    color: "inherit",
    "& .MuiSelect-icon": { color: "inherit" },
    // contrastText is white on the light-mode bar and dark on the dark-mode one.
    "& .MuiOutlinedInput-notchedOutline": {
      borderColor: (t: Theme) => alpha(t.palette.primary.contrastText, 0.6),
    },
    "&:hover .MuiOutlinedInput-notchedOutline": {
      borderColor: (t: Theme) => t.palette.primary.contrastText,
    },
  },
};

/** App-bar project picker. A switch clears every cached answer and goes home. */
export function ProjectSwitcher() {
  const { data } = useListProjectsQuery();
  const [switchProject] = useSwitchProjectMutation();
  const [createProject, { isLoading: creating }] = useCreateProjectMutation();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const dispatch = useDispatch();
  const navigate = useNavigate();

  if (!data) return null;

  const afterSwitch = () => {
    navigate("/");
    dispatch(baseApi.util.resetApiState());
  };

  const onPick = async (slug: string) => {
    if (slug === NEW) return setDialogOpen(true);
    if (slug === data.active) return;
    await switchProject(slug).unwrap();
    afterSwitch();
  };

  const closeDialog = () => {
    setDialogOpen(false);
    setName("");
    setError(null);
  };

  const onCreate = async () => {
    try {
      await createProject({ name: name.trim() }).unwrap();
    } catch {
      return setError("Couldn't create the project");
    }
    closeDialog();
    afterSwitch();
  };

  return (
    <>
      <Select
        size="small"
        value={data.active}
        onChange={(e) => void onPick(e.target.value)}
        aria-label="Project"
        sx={switcherStyles.select}
      >
        {data.projects.map((p) => (
          <MenuItem key={p.slug} value={p.slug}>
            {p.name}
          </MenuItem>
        ))}
        <Divider />
        <MenuItem value={NEW}>
          <Plus size={16} style={{ marginRight: 8 }} />
          New project…
        </MenuItem>
      </Select>
      <Dialog open={dialogOpen} onClose={closeDialog} fullWidth maxWidth="xs">
        <DialogTitle>New project</DialogTitle>
        <DialogContent>
          {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
          <TextField
            autoFocus
            fullWidth
            margin="dense"
            label="Name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && name.trim()) void onCreate();
            }}
            helperText="Starts empty, with its own parts, images and model files."
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={closeDialog}>Cancel</Button>
          <Button
            variant="contained"
            disabled={!name.trim() || creating}
            onClick={() => void onCreate()}
          >
            Create
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
