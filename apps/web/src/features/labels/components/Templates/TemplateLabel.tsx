import { useMemo } from "react";
import { renderLabelSvg, type LabelTemplate, type Part } from "@snowcat/shared";
import { Svg } from "./Svg";

type Props = { template: LabelTemplate; part: Part; render: string | null };

/** Any SVG template (e.g. one made in the label editor), at its mm size. */
export function SvgTemplateLabel({ template, part, render }: Props) {
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
