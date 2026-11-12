/**
 * An object that forwards every property read to whatever `get()` returns
 * now. Route plugins keep one repository for life; this lets that one follow
 * the active project.
 */
export function live<T extends object>(get: () => T): T {
  return new Proxy({} as T, {
    get: (_target, key) => Reflect.get(get(), key),
    has: (_target, key) => Reflect.has(get(), key),
  });
}
