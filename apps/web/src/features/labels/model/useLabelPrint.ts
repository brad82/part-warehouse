import { useEffect, useState } from "react";
import type { LabelTemplate, Part } from "@snowcat/shared";
import { renderStlToPng } from "./renderStlToPng";

/** Whether `template` prints the part's 3D render anywhere. */
export const usesRender = (template: LabelTemplate) =>
  template.elements.some((el) => el.type === "image");

/**
 * Owns the label dialog's choices (template, copies, 3D render) and the
 * print lifecycle: mount labels into the print root, wait a frame for
 * images, call window.print(), unmount after `afterprint`. `templates`
 * come from the API; until they load there is no template.
 */
export function useLabelPrint(
  part: Part,
  open: boolean,
  templates: LabelTemplate[],
) {
  const [templateId, setTemplateId] = useState<string | null>(null);
  const [copies, setCopies] = useState(1);
  const [includeRender, setIncludeRender] = useState(true);
  const [render, setRender] = useState<string | null>(null);
  const [rendering, setRendering] = useState(false);
  const [printing, setPrinting] = useState(false);

  const template =
    templates.find((t) => t.id === templateId) ?? templates[0] ?? null;
  const wantsRender = !!template && usesRender(template) && includeRender;

  useEffect(() => {
    if (!open || !wantsRender) return;
    let cancelled = false;
    setRendering(true);
    renderStlToPng(part.code).then((url) => {
      if (cancelled) return;
      setRender(url);
      setRendering(false);
    });
    return () => {
      cancelled = true;
    };
  }, [open, wantsRender, part.code]);

  useEffect(() => {
    if (!printing) return;
    const done = () => setPrinting(false);
    window.addEventListener("afterprint", done);
    const id = requestAnimationFrame(() =>
      requestAnimationFrame(() => window.print()),
    );
    return () => {
      cancelAnimationFrame(id);
      window.removeEventListener("afterprint", done);
    };
  }, [printing]);

  return {
    template,
    setTemplateId,
    copies,
    setCopies: (n: number) => setCopies(Math.max(1, Math.min(50, n || 1))),
    includeRender,
    setIncludeRender,
    render: wantsRender ? render : null,
    rendering: wantsRender && rendering,
    printing,
    print: () => setPrinting(true),
  };
}

export type LabelPrint = ReturnType<typeof useLabelPrint>;
