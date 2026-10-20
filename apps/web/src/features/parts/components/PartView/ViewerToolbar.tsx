import type { ReactNode } from "react";
import {
  Box,
  ToggleButton,
  ToggleButtonGroup,
  Tooltip,
} from "@mui/material";
import { Grid3x3, Monitor, Moon, Sun } from "lucide-react";
import type { PreviewColour } from "@parts-warehouse/shared";
import type { ModelColour, ModelColourChoice } from "../../model/useModelColour";
import type { ViewerAppearance, ViewerBackground } from "../../model/useViewerAppearance";

type Props = {
  appearance: ViewerAppearance;
  modelColour: ModelColour;
  colours: PreviewColour[];
};

const toolbarStyles = {
  root: {
    position: "absolute",
    top: 8,
    right: 8,
    zIndex: 1,
    display: "flex",
    flexWrap: "wrap",
    justifyContent: "flex-end",
    maxWidth: "calc(100% - 16px)",
    gap: 1,
    p: 0.5,
    borderRadius: 1,
    bgcolor: "background.paper",
    boxShadow: 1,
  },
  swatch: (colour: string) => ({
    width: 16,
    height: 16,
    borderRadius: "50%",
    bgcolor: colour,
    border: 1,
    borderColor: "divider",
  }),
  autoSwatch: (colour: string) => ({
    width: 16,
    height: 16,
    borderRadius: "50%",
    border: 2,
    borderColor: "text.secondary",
    background: `linear-gradient(135deg, ${colour} 50%, transparent 50%)`,
  }),
};

const BACKGROUNDS: { value: ViewerBackground; label: string; icon: ReactNode }[] = [
  { value: "theme", label: "Match app theme", icon: <Monitor size={14} /> },
  { value: "light", label: "Light background", icon: <Sun size={14} /> },
  { value: "dark", label: "Dark background", icon: <Moon size={14} /> },
];

/** Grid toggle, background toggle + model colour swatches, overlaid on the viewer. */
export function ViewerToolbar({ appearance, modelColour, colours }: Props) {
  return (
    <Box sx={toolbarStyles.root}>
      <Tooltip title="Grid and axes">
        <ToggleButton
          size="small"
          value="grid"
          aria-label="Grid and axes"
          selected={appearance.grid}
          onChange={() => appearance.setGrid(!appearance.grid)}
          sx={{ px: 1 }}
        >
          <Grid3x3 size={14} />
        </ToggleButton>
      </Tooltip>
      <ToggleButtonGroup
        exclusive
        size="small"
        aria-label="Viewer background"
        value={appearance.background}
        onChange={(_e, value: ViewerBackground | null) =>
          value && appearance.setBackground(value)
        }
      >
        {BACKGROUNDS.map((b) => (
          <Tooltip key={b.value} title={b.label}>
            <ToggleButton value={b.value} aria-label={b.label} sx={{ px: 1 }}>
              {b.icon}
            </ToggleButton>
          </Tooltip>
        ))}
      </ToggleButtonGroup>
      <ToggleButtonGroup
        exclusive
        size="small"
        aria-label="Model colour"
        value={modelColour.choice}
        onChange={(_e, value: ModelColourChoice | null) =>
          value != null && modelColour.choose(value)
        }
      >
        <Tooltip title="Match part colour">
          <ToggleButton value="auto" aria-label="Match part colour" sx={{ px: 1 }}>
            <Box sx={toolbarStyles.autoSwatch(modelColour.autoHex)} />
          </ToggleButton>
        </Tooltip>
        {colours.map((c) => (
          <Tooltip key={c.id} title={c.name}>
            <ToggleButton value={c.id} aria-label={c.name} sx={{ px: 1 }}>
              <Box sx={toolbarStyles.swatch(c.hex)} />
            </ToggleButton>
          </Tooltip>
        ))}
      </ToggleButtonGroup>
    </Box>
  );
}
