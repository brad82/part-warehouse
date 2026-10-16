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

export default defineConfig({
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes("node_modules")) return;
          if (id.includes("three") || id.includes("@react-three")) {
            return "three";
          }
          if (id.includes("@zxing") || id.includes("bwip-js")) {
            return "barcodes";
          }
          if (
            id.includes("@mui/") ||
            id.includes("@emotion/")
          ) {
            return "mui";
          }
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
