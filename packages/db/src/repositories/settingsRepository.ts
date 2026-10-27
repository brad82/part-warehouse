import type Database from "better-sqlite3";

/** App settings edited in the UI (Settings → Printers & devices). */
export function settingsRepository(db: Database.Database) {
  const get = (key: string) =>
    db
      .prepare<[string], { value: string }>("SELECT value FROM settings WHERE key = ?")
      .get(key)?.value ?? null;

  /** Stores `value` under `key`; null removes it. */
  const set = (key: string, value: string | null) => {
    if (value == null) db.prepare("DELETE FROM settings WHERE key = ?").run(key);
    else
      db.prepare(
        "INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT (key) DO UPDATE SET value = excluded.value",
      ).run(key, value);
  };

  return {
    /** The CUPS queue labels print to; null: the browser prints them. */
    labelPrinter: () => get("label_printer"),
    setLabelPrinter: (name: string | null) => set("label_printer", name),
  };
}

export type SettingsRepository = ReturnType<typeof settingsRepository>;
