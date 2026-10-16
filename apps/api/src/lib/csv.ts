/** Minimal RFC 4180 writer: quotes fields with commas, quotes or newlines. */
export function toCsv(rows: unknown[][]): string {
  return rows
    .map((row) =>
      row
        .map((value) => {
          const s = value == null ? "" : String(value);
          return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
        })
        .join(","),
    )
    .join("\n");
}
