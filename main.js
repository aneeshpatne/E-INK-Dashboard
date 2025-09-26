const helper = require("./helper");
const kindle = require("./connect");
const { getIstDate, isWithinHours } = require("./time");
const { createLegacyClockScreen } = require("./legacyClockScreen");

const ACTIVE_START_HOUR = 7;
const ACTIVE_END_HOUR = 23;
const BROWSER_URL = "http://192.168.1.36:8000";
const BROWSER_LAUNCH_DELAY_MS = 60 * 1000;

let mode = null; // "browser" | "legacy"
let legacyClock = null;
let isShuttingDown = false;

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function startup() {
  try {
    await helper.startKindle();
  } catch (e) {
    console.error("Failed to start Kindle UI:", e.message || e);
  }

  await delay(BROWSER_LAUNCH_DELAY_MS);

  try {
    await helper.startBrowser(BROWSER_URL);
  } catch (e) {
    console.error("Failed to launch browser:", e.message || e);
  }

  await delay(10 * 1000);

  try {
    await helper.setBacklight(10);
  } catch (e) {
    console.error("Failed to set daytime backlight:", e.message || e);
  }
}

async function startLegacyClock() {
  legacyClock = createLegacyClockScreen({ helper, kindle });
  await legacyClock.start();
}

async function main() {
  await kindle.connect();
  const istNow = getIstDate();

  if (isWithinHours(istNow, ACTIVE_START_HOUR, ACTIVE_END_HOUR)) {
    mode = "browser";
    await startup();
  } else {
    mode = "legacy";
    await startLegacyClock();
  }
}

async function shutdown() {
  if (isShuttingDown) return;
  isShuttingDown = true;

  try {
    if (mode === "legacy" && legacyClock) {
      await legacyClock.shutdown();
    } else if (mode === "browser") {
      try {
        await helper.setBacklight(0);
      } catch (e) {
        console.error("Failed to dim backlight on shutdown:", e.message || e);
      }

      try {
        await helper.endKindle();
      } catch (e) {
        console.error("Failed to stop Kindle UI on shutdown:", e.message || e);
      }
      try {
        await kindle.endBrowser();
      } catch (e) {
        console.error(
          "Failed to stop the browser on shutdown: ",
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
