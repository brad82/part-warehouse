import { useMemo } from "react";
import { SMALL_LABEL, renderLabelSvg, type Part } from "@snowcat/shared";
import { Svg } from "./Svg";

type Props = { part: Part };

/**
 * 1×2⅝in mailer label (Avery 5160). Layout lives in the shared SVG template
 * (`SMALL_LABEL`), which the CLI's sheet PDF prints too.
 */
export function SmallLabel({ part }: Props) {
  const svg = useMemo(() => renderLabelSvg(SMALL_LABEL, part), [part]);
  return (
    <Svg
      svg={svg}
      sx={{ width: `${SMALL_LABEL.widthMm}mm`, height: `${SMALL_LABEL.heightMm}mm` }}
    />
  );
}
