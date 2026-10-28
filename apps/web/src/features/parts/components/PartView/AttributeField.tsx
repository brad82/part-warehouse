import { IconButton, InputAdornment, MenuItem, TextField } from "@mui/material";
import { ExternalLink } from "lucide-react";
import { isNumericAttribute, parseAttributeValue, type AttributeDef } from "@parts-warehouse/shared";
import { attributeLabel } from "@shared/lib/attributeFields";

type Props = {
  def: AttributeDef;
  value: string;
  error: string | undefined;
  onChange: (value: string) => void;
};

/** One attribute input, shaped by its data type. */
export function AttributeField({ def, value, error, onChange }: Props) {
  const common = {
    fullWidth: true,
    size: "small" as const,
    label: attributeLabel(def),
    value,
    error: !!error,
    helperText: error ?? " ",
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => onChange(e.target.value),
  };

  if (def.dataType === "select") {
    // Keep a stored value visible even if it's no longer an option.
    const options = [...(def.options ?? [])];
    if (value && !options.includes(value)) options.push(value);
    return (
      <TextField {...common} select>
        <MenuItem value="">
          <em>None</em>
        </MenuItem>
        {options.map((o) => (
          <MenuItem key={o} value={o}>
            {o}
          </MenuItem>
        ))}
      </TextField>
    );
  }

  if (isNumericAttribute(def)) {
    return (
      <TextField
        {...common}
        type="number"
        slotProps={{
          htmlInput: { min: 0, step: def.dataType === "integer" ? "1" : "0.01" },
        }}
      />
    );
  }

  const link = def.dataType === "url" && parseAttributeValue(def, value).ok;
  return (
    <TextField
      {...common}
      slotProps={
        link
          ? {
              input: {
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton
                      size="small"
                      aria-label={`Open ${def.label}`}
                      href={value}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <ExternalLink size={16} />
                    </IconButton>
                  </InputAdornment>
                ),
              },
            }
          : undefined
      }
    />
  );
}
