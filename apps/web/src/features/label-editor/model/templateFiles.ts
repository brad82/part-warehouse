import {
  labelTemplateInputSchema,
  type LabelTemplateInput,
} from "@parts-warehouse/shared";

/** Downloads `template` as `<name>.json` (an import-ready template). */
export function downloadTemplate(template: LabelTemplateInput) {
  const blob = new Blob([JSON.stringify(template, null, 2)], {
    type: "application/json",
  });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = `${template.name.replace(/[^\w-]+/g, "-") || "label"}.json`;
  a.click();
  URL.revokeObjectURL(a.href);
}

/** Asks for a JSON file; null if none was chosen. */
export function pickJsonFile(): Promise<File | null> {
  return new Promise((resolve) => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "application/json,.json";
    input.onchange = () => resolve(input.files?.[0] ?? null);
    input.oncancel = () => resolve(null);
    input.click();
  });
}

/** Parses a template file; throws a readable Error when it isn't one. */
export async function readTemplateFile(
  file: File,
): Promise<LabelTemplateInput> {
  let json: unknown;
  try {
    json = JSON.parse(await file.text());
  } catch {
    throw new Error(`${file.name} isn't JSON`);
  }
  const parsed = labelTemplateInputSchema.safeParse(json);
  if (!parsed.success) throw new Error(`${file.name} isn't a label template`);
  return parsed.data;
}
