/** "Lead time (days)" → "lead_time_days": a key/id suggestion from a name. */
export function slug(name: string, separator = "_"): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, separator)
    .replace(new RegExp(`^${separator}+|${separator}+$`, "g"), "")
    .replace(/^(\d)/, "a$1");
}
