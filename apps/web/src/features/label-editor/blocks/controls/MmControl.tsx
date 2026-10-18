import { TextControl } from "@wordpress/components";

/** Millimetre input; ignores blanks and non-numbers while typing. */
export function MmControl({
  label,
  value,
  onChange,
  step = 0.1,
  min,
}: {
  label: string;
  value: number;
  onChange: (n: number) => void;
  step?: number;
  min?: number;
}) {
  return (
    <TextControl
      __next40pxDefaultSize
      __nextHasNoMarginBottom
      type="number"
      label={label}
      step={step}
      min={min}
      value={String(value)}
      onChange={(v) => {
        const n = parseFloat(v);
        if (Number.isFinite(n)) onChange(n);
      }}
    />
  );
}
