const { getIstDate, getTimeString } = require("./time");

const CLEAN_INTERVAL_MS = 15 * 60 * 1000;
const UPDATE_INTERVAL_MS = 60 * 1000;

function createLegacyClockScreen({ helper, kindle }) {
  let lastBacklightLevel = null;
  let updateTimeout = null;
  let updateInterval = null;
  let cleanupInterval = null;
  let isRunning = false;
  let isShuttingDown = false;

  async function updateTime() {
    try {
      await helper.clearTime();
      await helper.setTime(getTimeString(getIstDate()));
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

  function scheduleUpdateLoop() {
    const tick = () => {
      runClockUpdate().catch((e) =>
        console.error("Update loop error:", e.message || e)
      );
    };

    updateTimeout = setTimeout(() => {
      tick();
      updateInterval = setInterval(tick, UPDATE_INTERVAL_MS);
    }, msUntilNextMinute());
  }

  async function initialiseDisplay() {
    try {
      await helper.setRotation(0);
    } catch (e) {
      console.error("Failed to set rotation on startup:", e.message || e);
    }

    try {
      await kindle.exec("/mnt/us/usbnet/bin/fbink -q -c -f -W GC16");
    } catch (e) {
      console.error("Failed to clear display on startup:", e.message || e);
    }

    await cleanupDisplayRegion();
  }

  async function start() {
    if (isRunning) return;
    isRunning = true;

    await initialiseDisplay();
    await runClockUpdate();
    scheduleUpdateLoop();

    cleanupInterval = setInterval(() => {
      cleanupDisplayRegion().catch((e) =>
        console.error("Cleanup loop error:", e.message || e)
      );
    }, CLEAN_INTERVAL_MS);
  }

  async function shutdown() {
    if (!isRunning || isShuttingDown) return;
    isShuttingDown = true;

    if (updateTimeout) clearTimeout(updateTimeout);
    if (updateInterval) clearInterval(updateInterval);
    if (cleanupInterval) clearInterval(cleanupInterval);

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

    isRunning = false;
  }

  return {
    start,
    shutdown,
  };
}

module.exports = {
  createLegacyClockScreen,
};
