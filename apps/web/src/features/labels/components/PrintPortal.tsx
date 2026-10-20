import { createPortal } from "react-dom";
import { Box } from "@mui/material";
import type { LabelTemplate, Part } from "@parts-warehouse/shared";
import { TemplateLabel } from "./Templates/TemplateLabel";

type Props = {
  part: Part;
  template: LabelTemplate;
  render: string | null;
  copies: number;
};

/**
 * Mounts the labels into #print-root (hidden on screen, the only thing shown
 * when printing; see print.css) and sets @page to the template size, one
 * label per page.
 */
export function PrintPortal({ part, template, render, copies }: Props) {
  const root = document.getElementById("print-root");
  if (!root) return null;
  const pageCss = `@page { size: ${template.widthMm}mm ${template.heightMm}mm; margin: 0; }`;

  return createPortal(
    <>
      <style>{pageCss}</style>
      {Array.from({ length: copies }, (_, i) => (
        <Box
          key={i}
          sx={{ breakAfter: "page", "&:last-of-type": { breakAfter: "auto" } }}
        >
          <TemplateLabel part={part} template={template} render={render} />
        </Box>
      ))}
    </>,
    root,
  );
}
