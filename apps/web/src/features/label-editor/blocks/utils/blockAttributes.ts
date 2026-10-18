/** Block attribute definitions with the default a newly inserted block gets. */
export const num = (n: number) => ({ type: "number", default: n }) as const;
export const str = (s: string) => ({ type: "string", default: s }) as const;
export const bool = (b: boolean) => ({ type: "boolean", default: b }) as const;
