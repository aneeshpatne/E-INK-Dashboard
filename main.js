const helper = require("./helper");
const kindle = require("./connect");
const { getIstDate, isWithinHours } = require("./time");
const { createLegacyClockScreen } = require("./screen");

const ACTIVE_START_HOUR = 7;
const ACTIVE_END_HOUR = 23;
const BROWSER_URL = "http://192.168.1.36:8000";
const BROWSER_LAUNCH_DELAY_MS = 100 * 1000;
const RECONNECT_INITIAL_DELAY_MS = 5 * 1000;
const RECONNECT_POLL_INTERVAL_MS = 5 * 1000;

let mode = "legacy"; // "browser" | "legacy"
let legacyClock = null;
let isShuttingDown = false;

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
  console.log("[startup] Initiating Kindle UI launch");
  // try {
  //   await helper.startKindle();
  //   console.log("[startup] Kindle UI launch command sent");
  // } catch (e) {
  //   console.error("Failed to start Kindle UI:", e.message || e);
  // }

  // console.log("[startup] Closing SSH session to allow Kindle UI boot");
  // try {
  //   kindle.close();
  // } catch (e) {
  //   console.error("[startup] Failed to close SSH session:", e.message || e);
  // }

  // await waitForKindleReconnect();

  // console.log(
  //   `[startup] Waiting ${
  //     BROWSER_LAUNCH_DELAY_MS / 1000
  //   }s before starting browser`
  // );
  // await delay(BROWSER_LAUNCH_DELAY_MS);

  // console.log(`[startup] Launching browser at ${BROWSER_URL}`);
  // try {
  //   await helper.startBrowser(BROWSER_URL);
  //   console.log("[startup] Browser launch command sent");
  // } catch (e) {
  //   console.error("Failed to launch browser:", e.message || e);
  // }

  // console.log("[startup] Waiting 5s before setting backlight");
  // await delay(5 * 1000);

  // console.log("[startup] Setting backlight to level 10");
  // try {
  //   await helper.setBacklight(10);
  //   console.log("[startup] Backlight adjustment request sent");
  // } catch (e) {
  //   console.error("Failed to set daytime backlight:", e.message || e);
  // }
}

async function startLegacyClock() {
  legacyClock = createLegacyClockScreen({ helper, kindle });
  await legacyClock.start();
}

async function main() {
  await kindle.connect();
  console.log("[main] Forcing legacy mode (time check removed)");
  mode = "legacy";
  try {
    await startLegacyClock();
  } catch (e) {
    console.error("[main] startLegacyClock failed:", e && e.message ? e.message : e);
    await shutdown();
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
        // await helper.setBacklight(0);
        console.log("[shutdown] Backlight dim command sent");
      } catch (e) {
        console.error("Failed to dim backlight on shutdown:", e.message || e);
      }
      console.log("[shutdown] Waiting 5s after dimming backlight");
      await delay(5 * 1000);
      try {
        // await helper.endKindle();
        console.log("[shutdown] Kindle UI stop command sent");
      } catch (e) {
        console.error("Failed to stop Kindle UI on shutdown:", e.message || e);
      }
      console.log("[shutdown] Waiting 5s after stopping Kindle UI");
      await delay(5 * 1000);

      try {
        // await helper.endBrowser();
        console.log("[shutdown] Browser stop command sent");
      } catch (e) {
        console.error(
          "Failed to stop the browser on shutdown: ",
          e.message || e
        );
      }
      console.log("[shutdown] Waiting 5s after stopping browser");
      await delay(5 * 1000);

      try {
        await helper.blackDisplay();
        console.log("[shutdown] Display black command sent");
      } catch (e) {
        console.error("Failed to shut display on shutdown: ", e.message || e);
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
