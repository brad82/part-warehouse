import type { SerializedError } from "@reduxjs/toolkit";
import type { FetchBaseQueryError } from "@reduxjs/toolkit/query";

/** Turns an RTK Query error into a display string. */
export function errorMessage(
  error: FetchBaseQueryError | SerializedError | undefined,
  fallback: string,
): string | null {
  if (!error) return null;
  if ("data" in error) {
    const data = error.data as { message?: unknown } | undefined;
    if (typeof data?.message === "string") return data.message;
  }
  return fallback;
}
