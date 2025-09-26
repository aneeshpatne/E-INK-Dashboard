const helper = require("./helper");
const kindle = require("./connect");

const CLEAN_INTERVAL_MS = 15 * 60 * 1000;
const UPDATE_INTERVAL_MS = 60 * 1000;

let lastBacklightLevel = null;
let isShuttingDown = false;

function getIstDate() {
  const now = new Date();
  const utc = now.getTime() + now.getTimezoneOffset() * 60000;
  return new Date(utc + 5.5 * 60 * 60 * 1000);
}

function getTimeString() {
  const ist = getIstDate();
  const h = ist.getHours();
  const h12 = ((h + 11) % 12) + 1;
  const m = ist.getMinutes().toString().padStart(2, "0");
  return `${h12}:${m}`;
}

async function updateTime() {
  try {
    await helper.clearTime();
    await helper.setTime(getTimeString());
  } catch (e) {
    console.error("Update failed:", e.message || e);
  }
}

async function cleanupDisplayRegion() {
  try {
    await helper.refreshRegion();
  } catch (e) {
    console.error("Cleanup failed:", e.message || e);
  }
}

async function adjustBacklight() {
  try {
    const ist = getIstDate();
    const hour = ist.getHours();
    const isDaytime = hour >= 7 && hour < 23;
    const targetLevel = isDaytime ? 20 : 0;
    if (targetLevel !== lastBacklightLevel) {
      await helper.setBacklight(targetLevel);
      lastBacklightLevel = targetLevel;
    }
  } catch (e) {
    console.error("Backlight adjustment failed:", e.message || e);
  }
}

function msUntilNextMinute() {
  const now = Date.now();
  return UPDATE_INTERVAL_MS - (now % UPDATE_INTERVAL_MS);
}

async function runClockUpdate() {
  await updateTime();
  await adjustBacklight();
}

(async () => {
  await kindle.connect();
  try {
    await helper.setRotation(0);
  } catch (e) {
    console.error("Failed to set rotation on startup:", e.message || e);
  }
  await kindle.exec("/mnt/us/usbnet/bin/fbink -q -c -f -W GC16");
  await cleanupDisplayRegion();
  await runClockUpdate();
  setTimeout(() => {
    runClockUpdate();
    setInterval(runClockUpdate, UPDATE_INTERVAL_MS);
  }, msUntilNextMinute());
  setInterval(cleanupDisplayRegion, CLEAN_INTERVAL_MS);
})();

async function shutdown() {
  if (isShuttingDown) return;
  isShuttingDown = true;

  try {
    await helper.setBacklight(0);
  } catch (e) {
    console.error("Failed to dim backlight on shutdown:", e.message || e);
  }

  try {
    await helper.setRotation(3);
  } catch (e) {
    console.error("Failed to set rotation on shutdown:", e.message || e);
  }

  try {
    await kindle.exec("/mnt/us/usbnet/bin/fbink -q -k -B WHITE -f -W GC16");
  } catch (e) {
    console.error("Failed to run final fbink refresh:", e.message || e);
  }

  try {
    kindle.close();
  } catch (_) {}
  process.exit(0);
}
process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
