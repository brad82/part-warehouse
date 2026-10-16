import { useEffect, useState } from "react";
import type { Part } from "@snowcat/shared";
import { renderStlToPng } from "./renderStlToPng";
import { templateById, type LabelTemplate } from "./templates";

/**
 * Owns the label dialog's choices (template, copies, 3D render) and the
 * print lifecycle: mount labels into the print root, wait a frame for
 * images, call window.print(), unmount after `afterprint`.
 */
export function useLabelPrint(part: Part, open: boolean) {
  const [templateId, setTemplateId] = useState<LabelTemplate["id"]>("bag");
  const [copies, setCopies] = useState(1);
  const [includeRender, setIncludeRender] = useState(true);
  const [render, setRender] = useState<string | null>(null);
  const [rendering, setRendering] = useState(false);
  const [printing, setPrinting] = useState(false);

  const template = templateById(templateId);
  const wantsRender = template.supportsRender && includeRender;

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
