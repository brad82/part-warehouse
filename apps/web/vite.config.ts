import react from "@vitejs/plugin-react";
import { existsSync, readFileSync } from "node:fs";
import { fileURLToPath, URL } from "node:url";
import { defineConfig } from "vite";
import { aliases } from "./aliases";

// Optional HTTPS for the iPad (camera scanning needs a secure origin).
// Put a trusted cert in parts-app/certs/ (see README) and it's picked up.
const certDir = fileURLToPath(new URL("../../certs/", import.meta.url));
const https = existsSync(`${certDir}cert.pem`)
  ? {
      cert: readFileSync(`${certDir}cert.pem`),
      key: readFileSync(`${certDir}key.pem`),
    }
  : undefined;

type ModuleInfo = {
  isEntry: boolean;
  importers: readonly string[];
  dynamicImporters: readonly string[];
};

/**
 * True when only Gutenberg (the lazy label editor) pulls `id` in, so it can
 * ride in the editor's chunk instead of the eager vendor chunk.
 */
function editorOnly(
  id: string,
  getModuleInfo: (id: string) => ModuleInfo | null,
  seen = new Set<string>(),
): boolean {
  if (id.includes("@wordpress/")) return true;
  if (!id.includes("node_modules")) return false;
  if (seen.has(id)) return true;
  seen.add(id);
  const info = getModuleInfo(id);
  if (!info || info.isEntry) return false;
  const importers = [...info.importers, ...info.dynamicImporters];
  return (
    importers.length > 0 &&
    importers.every((i) => editorOnly(i, getModuleInfo, seen))
  );
}

export default defineConfig({
  build: {
    rollupOptions: {
      output: {
        manualChunks(id, { getModuleInfo }) {
          if (!id.includes("node_modules")) return;
          // React gets its own chunk: every other chunk imports it, so it
          // must not depend on them (a cycle leaves React undefined at load).
          if (/node_modules\/(react|react-dom|scheduler)\//.test(id)) {
            return "react";
          }
          // Media-upload workers (WASM, ~13MB) are dynamic imports Gutenberg
          // only makes on upload; left unassigned they stay separate chunks.
          if (/@wordpress\/(vips|video-conversion)\//.test(id)) return;
          if (editorOnly(id, getModuleInfo)) return "wordpress";
          if (id.includes("three") || id.includes("@react-three")) {
            return "three";
          }
          if (id.includes("@zxing") || id.includes("bwip-js")) {
            return "barcodes";
          }
          if (id.includes("@mui/") || id.includes("@emotion/")) {
            return "mui";
          }
          // Shared helpers (use-sync-external-store, @babel/runtime, …) used by
          // several chunks above. Left unassigned, Rollup drops each into one of
          // them and creates a cycle between three and mui.
          return "vendor";
        },
      },
    },
  },
  plugins: [react()],
  resolve: { alias: aliases },
  server: {
    port: 3000,
    // Listen on the LAN so an iPad can open the app and add it to its home screen.
    host: true,
    // Test server (erp.dvl.lan) reaches Vite through a reverse proxy.
    allowedHosts: [".dvl.lan"],
    https,
    proxy: {
      // The API serves routes at the root; `/api` is stripped so the web app
      // can use one relative base URL.
      "/api": {
        target: "http://127.0.0.1:4000",
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, ""),
      },
    },
  },
});
