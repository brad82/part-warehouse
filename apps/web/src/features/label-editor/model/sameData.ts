/** JSON with object keys sorted, so key order doesn't matter. */
function canonical(value: unknown): string {
  return JSON.stringify(value, (_key, v: unknown) =>
    v && typeof v === "object" && !Array.isArray(v)
      ? Object.fromEntries(
          Object.entries(v).sort(([a], [b]) => a.localeCompare(b)),
        )
      : v,
  );
}

/** Deep equality for plain JSON data, ignoring object key order. */
export const sameData = (a: unknown, b: unknown) =>
  canonical(a) === canonical(b);
