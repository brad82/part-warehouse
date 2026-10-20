import { chromium, type BrowserContext, type Page } from "playwright-core";
import { ScrapeError } from "./scrapeImages.js";

/** A page as a real browser sees it, after its scripts have run. */
export type RenderedPage = { html: string; url: string };

/** Loads a page in a browser; see createPageRenderer. */
export type PageRenderer = {
  render: (url: string) => Promise<RenderedPage>;
  close: () => Promise<void>;
};

const GOTO_TIMEOUT_MS = 20_000;
/** Longest wait for a script-built page to settle after it loads. */
const SETTLE_MS = 6_000;
/** Close the browser after this long unused, to give its memory back. */
const IDLE_MS = 60_000;
/** Headed mode: how long a person has to solve a robot check in the window. */
const SOLVE_MS = 3 * 60_000;

export const ROBOT_CHECK_MESSAGE =
  "The supplier site asked for a robot check. Take a photo or upload an image instead.";

/** Signs the page is a human check (reCAPTCHA, hCaptcha, Cloudflare, AliExpress). */
async function isRobotCheck(page: Page): Promise<boolean> {
  if (/\/_____tmd_____\/punish/.test(page.url())) return true;
  const title = await page.title().catch(() => "");
  if (/just a moment|attention required|robot check/i.test(title)) return true;
  const challenge = await page
    .locator(
      'iframe[src*="recaptcha"], iframe[src*="hcaptcha"], iframe[src*="challenges.cloudflare.com"], #challenge-form',
    )
    .count()
    .catch(() => 0);
  return challenge > 0;
}

/** Done once product data shows up, or the network goes quiet. */
async function settle(page: Page) {
  await Promise.race([
    page.waitForLoadState("networkidle", { timeout: SETTLE_MS }),
    page.waitForSelector('meta[property="og:image"], script[type="application/ld+json"]', {
      state: "attached",
      timeout: SETTLE_MS,
    }),
  ]).catch(() => {});
}

/** Polls until the robot check is gone (someone solved it) or time runs out. */
async function waitForPerson(page: Page) {
  const deadline = Date.now() + SOLVE_MS;
  while (Date.now() < deadline && (await isRobotCheck(page))) {
    await page.waitForTimeout(1_000).catch(() => {});
    if (page.isClosed()) return;
  }
}

/**
 * Headless Chromium for supplier pages that only show their product data
 * once scripts run. One persistent profile (`profileDir`) keeps cookies
 * between fetches, as an everyday browser would. Pages load one at a time;
 * the browser starts on first use and closes when idle. A human check is
 * reported, never solved; with `headed`, the window shows and waits for a
 * person to solve it there, and the cookie it earns is kept in the profile.
 */
export function createPageRenderer({
  profileDir,
  headed = false,
}: {
  profileDir: string;
  headed?: boolean;
}): PageRenderer {
  let context: Promise<BrowserContext> | null = null;
  let queue: Promise<unknown> = Promise.resolve();
  let idle: NodeJS.Timeout | undefined;

  const close = async () => {
    clearTimeout(idle);
    const open = context;
    context = null;
    await (await open?.catch(() => null))?.close();
  };

  const browser = () => {
    context ??= chromium.launchPersistentContext(profileDir, { headless: !headed }).catch((err) => {
      context = null;
      const message = (err as Error).message;
      throw new ScrapeError(
        /Executable doesn't exist/.test(message)
          ? "The page browser isn't installed. Run `npm run browser:install -w apps/api` on the server."
          : `Couldn't start the page browser (${message.split("\n")[0]})`,
      );
    });
    return context;
  };

  async function load(url: string): Promise<RenderedPage> {
    clearTimeout(idle);
    const page = await (await browser()).newPage();
    try {
      try {
        await page.goto(url, { waitUntil: "domcontentloaded", timeout: GOTO_TIMEOUT_MS });
      } catch {
        throw new ScrapeError(`Couldn't load ${new URL(url).host}`);
      }
      await settle(page);
      if (headed && (await isRobotCheck(page))) {
        await page.bringToFront();
        await waitForPerson(page);
        await settle(page);
      }
      if (await isRobotCheck(page)) throw new ScrapeError(ROBOT_CHECK_MESSAGE);
      return { html: await page.content(), url: page.url() };
    } finally {
      await page.close().catch(() => {});
      idle = setTimeout(() => void close(), IDLE_MS).unref();
    }
  }

  return {
    render(url) {
      const next = queue.then(() => load(url));
      queue = next.catch(() => {});
      return next;
    },
    close,
  };
}
