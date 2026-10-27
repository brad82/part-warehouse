import { useEffect, useState } from "react";
import type { LabelTemplate, Part } from "@parts-warehouse/shared";
import { useGetCapabilitiesQuery } from "@shared/api/capabilitiesApi";
import { errorMessage } from "@shared/api/errors";
import { fetchLabelPdf, usePrintLabelMutation } from "../api/labelsApi";
import { openPdf } from "./openPdf";
import { renderPartPreview } from "./renderPartPreview";

/** Whether `template` prints the part's render or image anywhere. */
export const usesRender = (template: LabelTemplate) =>
  template.elements.some((el) => el.type === "image");

/**
 * Owns the label dialog's choices (template, copies, 3D render) and
 * printing. The API renders the PDF; with a server printer it prints it
 * too, otherwise it opens in a new tab to print from the browser.
 * `templates` come from the API; until they load there is no template.
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
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState<string | null>(null);
  const [printLabel] = usePrintLabelMutation();
  const printer = useGetCapabilitiesQuery().data?.labelPrinter ?? null;

  const template =
    templates.find((t) => t.id === templateId) ?? templates[0] ?? null;
  const wantsRender = !!template && usesRender(template) && includeRender;

  useEffect(() => {
    if (!open || !wantsRender) return;
    let cancelled = false;
    setRendering(true);
    renderPartPreview(part.code).then((url) => {
      if (cancelled) return;
      setRender(url);
      setRendering(false);
    });
    return () => {
      cancelled = true;
    };
  }, [open, wantsRender, part.code]);

  const print = async () => {
    if (!template) return;
    const request = {
      code: part.code,
      templateId: template.id,
      copies,
      render: wantsRender ? render : null,
    };
    setPrinting(true);
    setError(null);
    setSent(null);
    try {
      if (printer) {
        await printLabel(request).unwrap();
        setSent(`Sent ${copies} label${copies === 1 ? "" : "s"} to ${printer}.`);
      } else {
        await openPdf(fetchLabelPdf(request));
      }
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : errorMessage(e as Parameters<typeof errorMessage>[0], "Couldn't print the label."),
      );
    } finally {
      setPrinting(false);
    }
  };

  return {
    template,
    setTemplateId,
    copies,
    setCopies: (n: number) => setCopies(Math.max(1, Math.min(50, n || 1))),
    includeRender,
    setIncludeRender,
    render: wantsRender ? render : null,
    rendering: wantsRender && rendering,
    /** The server printer's name; null when the browser prints. */
    printer,
    printing,
    error,
    sent,
    print,
  };
}

export type LabelPrint = ReturnType<typeof useLabelPrint>;
