import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import path from "node:path";

type AppFile = { activeProject?: string; labelPrinter?: string | null };

/**
 * Machine-wide settings in `<dataDir>/app.json`: which project is active and
 * which printer prints labels. These don't change when the project does.
 */
export function appSettings(dataDir: string) {
  const file = path.join(dataDir, "app.json");

  const read = (): AppFile =>
    existsSync(file) ? (JSON.parse(readFileSync(file, "utf8")) as AppFile) : {};

  const update = (patch: AppFile) => {
    mkdirSync(dataDir, { recursive: true });
    const tmp = `${file}.tmp`;
    writeFileSync(tmp, JSON.stringify({ ...read(), ...patch }, null, 2));
    renameSync(tmp, file);
  };

  return {
    activeProject: () => read().activeProject ?? null,
    setActiveProject: (slug: string) => update({ activeProject: slug }),
    /** Same shape as the db's settingsRepository, so routes take either. */
    labelPrinter: () => read().labelPrinter ?? null,
    setLabelPrinter: (name: string | null) => update({ labelPrinter: name }),
  };
}

export type AppSettings = ReturnType<typeof appSettings>;
