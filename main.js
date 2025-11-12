import * as helper from "./helper.js";
import * as kindle from "./connect.js";
import { getIstDate, isWithinHours } from "./time.js";
import { createLegacyClockScreen } from "./screen.js";
import * as browserMode from "./browser.js";

const ACTIVE_START_HOUR = 7;
const ACTIVE_END_HOUR = 23;
const BROWSER_URL = "http://192.168.1.36:8000";
const BROWSER_LAUNCH_DELAY_MS = 100 * 1000;
const RECONNECT_INITIAL_DELAY_MS = 5 * 1000;
const RECONNECT_POLL_INTERVAL_MS = 5 * 1000;

// Enable fetching news items alternately with alerts on quarter-hour activations
const NEWS_ENABLED = true;
let lastScreenWasNews = false;

let mode = "legacy"; // "browser" | "legacy"
let legacyClock = null;
let isShuttingDown = false;
let screenIntervalId = null;
let screenAlignTimeout = null;
let isScreenActive = false;

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function waitForKindleReconnect() {
  console.log(
    `[startup] Waiting ${
      RECONNECT_INITIAL_DELAY_MS / 1000
    }s before reconnect attempts`
  );
  await delay(RECONNECT_INITIAL_DELAY_MS);

  while (true) {
    try {
      console.log("[startup] Attempting to reconnect to Kindle over SSH");
      await kindle.connect();
      console.log("[startup] Reconnected to Kindle over SSH");
      break;
    } catch (e) {
      console.error("[startup] Reconnect attempt failed:", e.message || e);
      console.log(
        `[startup] Retrying in ${RECONNECT_POLL_INTERVAL_MS / 1000}s`
      );
      await delay(RECONNECT_POLL_INTERVAL_MS);
    }
  }
}

async function startup() {
  console.log("[startup] Delegating to browser mode startup");
  await browserMode.start();
}

async function startLegacyClock() {
  legacyClock = createLegacyClockScreen({ helper, kindle });
  await legacyClock.start();
}

async function main() {
  await kindle.connect();
  console.log("[main] Forcing legacy mode (time check removed)");
  mode = "legacy";
  // Ensure browser (default) is up at 7:00 daily. If currently within active hours, start it now.
  try {
    const now = getIstDate();
    if (isWithinHours(now, ACTIVE_START_HOUR, ACTIVE_END_HOUR)) {
      console.log("[main] Within active hours — ensuring browser is started");
      try {
        await kindle.connect();
      } catch (_) {}
      try {
        await browserMode.start();
        mode = "browser";
      } catch (e) {
        console.error(
          "[main] browser start failed:",
          e && e.message ? e.message : e
        );
      }
    } else {
      console.log(
        "[main] Not active hours — browser will be started at 07:00 IST"
      );
    }

    scheduleDailyAt(ACTIVE_START_HOUR, 0, async () => {
      console.log("[schedule] 07:00 triggered — starting browser");
      try {
        await kindle.connect();
      } catch (_) {}
      start;
      try {
        await browserMode.start();
        mode = "browser";
      } catch (e) {
        console.error(
          "[schedule] browser start failed:",
          e && e.message ? e.message : e
        );
      }
    });

    scheduleDailyAt(ACTIVE_END_HOUR, 0, async () => {
      console.log("[schedule] 23:00 triggered — shutting down UI");
      try {
        await kindle.connect();
      } catch (_) {}
      try {
        await browserMode.shutdown();
        mode = "legacy";
      } catch (e) {
        console.error(
          "[schedule] browser shutdown failed:",
          e && e.message ? e.message : e
        );
      }
    });

    scheduleScreenLoop();
  } catch (e) {
    console.error("[main] startup failed:", e && e.message ? e.message : e);
    await shutdown();
  }
}

function msUntilNextQuarter() {
  const now = getIstDate();
  const minutes = now.getMinutes();
  const seconds = now.getSeconds();
  const ms = now.getMilliseconds();
  const nextQuarter =
    Math.ceil((minutes * 60 + seconds + ms / 1000) / (15 * 60)) * (15 * 60);
  const targetSeconds = nextQuarter;
  const targetMinutes = Math.floor(targetSeconds / 60);
  const targetSecs = Math.floor(targetSeconds % 60);
  const next = new Date(now.getTime());
  next.setMinutes(targetMinutes, targetSecs, 0);
  if (next.getTime() <= now.getTime()) next.setMinutes(next.getMinutes() + 15);
  return next.getTime() - now.getTime();
}

function scheduleScreenLoop() {
  const align = msUntilNextQuarter();
  console.log(
    `[schedule] Screen loop aligning in ${Math.round(align / 1000)}s`
  );
  screenAlignTimeout = setTimeout(() => {
    activateScreenOnce().catch((e) =>
      console.error("[schedule] initial screen activation failed:", e)
    );
    screenIntervalId = setInterval(() => {
      activateScreenOnce().catch((e) =>
        console.error("[schedule] screen activation failed:", e)
      );
    }, 15 * 60 * 1000);
  }, align);
}

async function activateScreenOnce() {
  if (isScreenActive) return;
  const now = getIstDate();
  if (!isWithinHours(now, ACTIVE_START_HOUR, ACTIVE_END_HOUR)) {
    console.log(
      `[screen-schedule] Skipping activation at ${now.toISOString()} — outside active hours (${ACTIVE_START_HOUR}:00-${ACTIVE_END_HOUR}:00 IST)`
    );
    return;
  }
  isScreenActive = true;
  let screen = null;
  try {
    console.log("[screen-schedule] Activating screen mode");
    let screenType = "alert";
    if (NEWS_ENABLED) {
      screenType = lastScreenWasNews ? "alert" : "news";
      lastScreenWasNews = !lastScreenWasNews;
    }

    screen = createLegacyClockScreen({ helper, kindle });
    await screen.start(screenType);
    await delay(45 * 1000);
    await screen.shutdown();
    console.log("[screen-schedule] Deactivated screen mode");
  } catch (e) {
    console.error(
      "[screen-schedule] screen activation error:",
      e && e.message ? e.message : e
    );
    try {
      if (screen) await screen.shutdown();
    } catch (_) {}
  } finally {
    isScreenActive = false;
  }
}

function scheduleDailyAt(hour, minute, fn) {
  const now = getIstDate();
  const target = new Date(now.getTime());
  target.setHours(hour, minute, 0, 0);
  if (target.getTime() <= now.getTime()) target.setDate(target.getDate() + 1);
  const ms = target.getTime() - now.getTime();
  setTimeout(() => {
    fn();

    setInterval(fn, 24 * 60 * 60 * 1000);
  }, ms);
}

async function shutdown() {
  if (isShuttingDown) return;
  isShuttingDown = true;

  try {
    if (mode === "legacy" && legacyClock) {
      await legacyClock.shutdown();
    } else if (mode === "browser") {
      try {
        await kindle.connect();
      } catch (_) {}

      try {
        await browserMode.shutdown();
        console.log("[shutdown] browserMode.shutdown() completed");
      } catch (e) {
        console.error(
          "[shutdown] browser-mode shutdown failed:",
          e && e.message ? e.message : e
        );
      }

      try {
        await helper.blackDisplay();
        console.log("[shutdown] Display black command sent (fallback)");
      } catch (e) {
        console.error(
          "Failed to shut display on shutdown (fallback): ",
          e.message || e
        );
      }
    }
  } finally {
    try {
      kindle.close();
    } catch (_) {}
    process.exit(0);
  }
}

main().catch((err) => {
  console.error("Fatal startup error:", err.message || err);
  shutdown();
});

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
