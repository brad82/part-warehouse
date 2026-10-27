import { useMemo } from "react";
import { renderLabelSvg } from "@parts-warehouse/labels";
import { type LabelLayout, type Part } from "@parts-warehouse/shared";
import { Svg } from "./Svg";

type Props = { template: LabelLayout; part: Part; render: string | null };

/** A label template filled in for `part`, at its printed mm size. */
export function TemplateLabel({ template, part, render }: Props) {
  const svg = useMemo(
    () => renderLabelSvg(template, part, { render }),
    [template, part, render],
  );
  return (
    <Svg
      svg={svg}
      sx={{ width: `${template.widthMm}mm`, height: `${template.heightMm}mm` }}
    />
  );
}
