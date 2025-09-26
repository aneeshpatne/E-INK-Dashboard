const helper = require("./helper");
const kindle = require("./connect");

const BROWSER_URL = "http://192.168.1.36:8000";
const BROWSER_LAUNCH_DELAY_MS = 100 * 1000;
const RECONNECT_INITIAL_DELAY_MS = 5 * 1000;
const RECONNECT_POLL_INTERVAL_MS = 5 * 1000;

const delay = (ms) => new Promise((r) => setTimeout(r, ms));

async function waitForKindleReconnect() {
  console.log(
    `[browser] Waiting ${
      RECONNECT_INITIAL_DELAY_MS / 1000
    }s before reconnect attempts`
  );
  await delay(RECONNECT_INITIAL_DELAY_MS);

  while (true) {
    try {
      console.log("[browser] Attempting to reconnect to Kindle over SSH");
      await kindle.connect();
      console.log("[browser] Reconnected to Kindle over SSH");
      break;
    } catch (e) {
      console.error("[browser] Reconnect attempt failed:", e.message || e);
      console.log(
        `[browser] Retrying in ${RECONNECT_POLL_INTERVAL_MS / 1000}s`
      );
      await delay(RECONNECT_POLL_INTERVAL_MS);
    }
  }
}

async function start() {
  const helper = require("./helper");

  const BROWSER_URL = "http://192.168.1.36:8000";

  async function start() {
    await helper.bootKindleAndLaunchBrowser(BROWSER_URL);
  }

  async function shutdown() {
    await helper.shutdownUI();
  }

  module.exports = { start, shutdown };
}
