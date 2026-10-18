import { SelectControl } from "@wordpress/components";
import { useCanvasEnv } from "../../model/CanvasContext";

/** Select over part fields and attribute keys. */
export function FieldSelect({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (field: string) => void;
  placeholder?: string;
}) {
  const { fields } = useCanvasEnv();
  const options = placeholder
    ? [{ value: "", label: placeholder }, ...fields]
    : fields;
  return (
    <SelectControl
      __next40pxDefaultSize
      __nextHasNoMarginBottom
      label={label}
      value={value}
      options={options}
      onChange={onChange}
    />
  );
}
