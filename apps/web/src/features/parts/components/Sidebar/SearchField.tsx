import { Box, IconButton, InputAdornment, TextField } from "@mui/material";
import { Search, X } from "lucide-react";
import { usePartsSidebar } from "../../PartsProvider";

export function SearchField() {
  const { search, onSearchChange } = usePartsSidebar();
  return (
    <Box sx={{ p: 1.5 }}>
      <TextField
        fullWidth
        size="small"
        placeholder="Search parts"
        value={search}
        onChange={(e) => onSearchChange(e.target.value)}
        slotProps={{
          htmlInput: { "aria-label": "Search parts" },
          input: {
            startAdornment: (
              <InputAdornment position="start">
                <Search size={16} />
              </InputAdornment>
            ),
            endAdornment: search ? (
              <InputAdornment position="end">
                <IconButton
                  size="small"
                  aria-label="Clear search"
                  onClick={() => onSearchChange("")}
                >
                  <X size={16} />
                </IconButton>
              </InputAdornment>
            ) : null,
          },
        }}
      />
    </Box>
  );
}
