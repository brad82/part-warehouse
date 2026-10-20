import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import {
  labelTemplateInputSchema,
  type LabelTemplateInput,
} from "@parts-warehouse/shared";

/**
 * The built-in templates: every `<id>.json` in `dir`, validated. Throws
 * naming the file when one isn't a valid template.
 */
export function loadLabelTemplateFiles(
  dir: string,
): (LabelTemplateInput & { id: string })[] {
  return readdirSync(dir)
    .filter((file) => file.endsWith(".json"))
    .sort()
    .map((file) => {
      const parsed = labelTemplateInputSchema.safeParse(
        JSON.parse(readFileSync(path.join(dir, file), "utf8")),
      );
      if (!parsed.success) {
        throw new Error(
          `Invalid label template ${file}: ${parsed.error.message}`,
        );
      }
      return { id: path.basename(file, ".json"), ...parsed.data };
    });
}
