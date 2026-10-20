import { fileURLToPath, URL } from "node:url";

export const aliases = {
  "@parts-warehouse/shared": fileURLToPath(
    new URL("../../packages/shared/src/index.ts", import.meta.url),
  ),
  "@app": fileURLToPath(new URL("./src/app", import.meta.url)),
  "@features": fileURLToPath(new URL("./src/features", import.meta.url)),
  "@shared": fileURLToPath(new URL("./src/shared", import.meta.url)),
};
