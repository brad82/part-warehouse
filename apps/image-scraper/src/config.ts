import { fileURLToPath } from "node:url";
import path from "node:path";

const appRoot = fileURLToPath(new URL("../../..", import.meta.url));

export const config = {
  /** gRPC listen address. Keep it private: the API is the only caller. */
  address: process.env.IMAGE_SCRAPER_ADDRESS ?? "127.0.0.1:50051",
  /**
   * Headless Chromium fallback for supplier pages a plain fetch can't read
   * (PAGE_BROWSER=off disables it). Its cookies persist in the profile dir.
   */
  pageBrowser: process.env.PAGE_BROWSER !== "off",
  /**
   * PAGE_BROWSER_HEADED=1 shows the browser window, so a person at this
   * machine can solve a robot check once; needs a display.
   */
  pageBrowserHeaded: process.env.PAGE_BROWSER_HEADED === "1",
  browserProfileDir:
    process.env.BROWSER_PROFILE_DIR ?? path.join(appRoot, "data", "browser-profile"),
};
