import type { FastifyPluginAsyncZod } from "fastify-type-provider-zod";
import { labelPrinterSettingSchema } from "@parts-warehouse/shared";
import type { SettingsRepository } from "@parts-warehouse/db";
import type { PrintSystem } from "../lib/printers.js";

/** Settings → Printers & devices: the machine's printers and which prints labels. */
export const printersRoutes: FastifyPluginAsyncZod<{
  settings: SettingsRepository;
  printSystem: PrintSystem;
}> = async (app, { settings, printSystem }) => {
  app.get("/printers", async () => printSystem.listPrinters());

  app.get("/settings/label-printer", async () => ({
    printer: settings.labelPrinter(),
  }));

  app.put(
    "/settings/label-printer",
    { schema: { body: labelPrinterSettingSchema } },
    async (request, reply) => {
      const { printer } = request.body;
      if (printer) {
        const names = (await printSystem.listPrinters()).map((p) => p.name);
        if (!names.includes(printer)) {
          return reply.badRequest(`No printer named "${printer}"`);
        }
      }
      settings.setLabelPrinter(printer);
      return { printer };
    },
  );
};
