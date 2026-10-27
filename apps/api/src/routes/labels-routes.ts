import type { FastifyPluginAsyncZod } from "fastify-type-provider-zod";
import type { z } from "zod";
import {
  labelPageSheet,
  labelPrintRequestSchema,
} from "@parts-warehouse/shared";
import type {
  LabelTemplatesRepository,
  PartsRepository,
  SettingsRepository,
} from "@parts-warehouse/db";
import { renderLabelsPdf } from "@parts-warehouse/label-pdf";
import type { PrintSystem } from "../lib/printers.js";

type Options = {
  repo: PartsRepository;
  templates: LabelTemplatesRepository;
  /** Its label printer (none: the web app prints /labels/pdf itself). */
  settings: SettingsRepository;
  printSystem: PrintSystem;
};

// Room for the render the web app sends as a data URL.
const bodyLimit = 10 * 1024 * 1024;

/**
 * A part's label as a PDF, one label per label-sized page: rendered here so
 * the server printer and browser printing get the same file.
 */
export const labelsRoutes: FastifyPluginAsyncZod<Options> = async (
  app,
  { repo, templates, settings, printSystem },
) => {
  /** The PDF of `copies` labels, or what's missing. */
  const render = async (
    { code, templateId, render }: z.output<typeof labelPrintRequestSchema>,
    copies: number,
  ) => {
    const part = repo.getPart(code);
    if (!part) return "Part not found";
    const template = templates.get(templateId);
    if (!template) return "Template not found";
    const { pdf } = await renderLabelsPdf(Array(copies).fill(part), {
      template,
      sheet: labelPageSheet(template),
      assets: () => ({ render }),
    });
    return { pdf, template };
  };

  app.post(
    "/labels/pdf",
    { bodyLimit, schema: { body: labelPrintRequestSchema } },
    async (request, reply) => {
      const out = await render(request.body, request.body.copies);
      if (typeof out === "string") return reply.notFound(out);
      return reply
        .type("application/pdf")
        .header("Content-Disposition", `inline; filename="${request.body.code}.pdf"`)
        .send(out.pdf);
    },
  );

  app.post(
    "/labels/print",
    { bodyLimit, schema: { body: labelPrintRequestSchema } },
    async (request, reply) => {
      const printer = settings.labelPrinter();
      if (!printer) return reply.conflict("No label printer configured");
      // One label; the printer makes the copies.
      const out = await render(request.body, 1);
      if (typeof out === "string") return reply.notFound(out);
      const { copies } = request.body;
      await printSystem.print(printer, out.pdf, {
        widthMm: out.template.widthMm,
        heightMm: out.template.heightMm,
        copies,
      });
      return { printer, copies };
    },
  );
};
