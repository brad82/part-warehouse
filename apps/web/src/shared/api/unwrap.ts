import { errorMessage } from "@shared/api/errors";

/** Unwraps a mutation, turning its error into one with the API's message. */
export async function unwrap(promise: { unwrap: () => Promise<unknown> }, fallback: string) {
  try {
    await promise.unwrap();
  } catch (e) {
    throw new Error(errorMessage(e as Parameters<typeof errorMessage>[0], fallback) ?? fallback);
  }
}
