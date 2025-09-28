const kindle = require("./connect");

const delay = (ms) => new Promise((r) => setTimeout(r, ms));

async function waitForKindleReconnect(
  initialDelayMs = 5 * 1000,
  pollIntervalMs = 5 * 1000
) {
  console.log(
    `[helper] Waiting ${initialDelayMs / 1000}s before reconnect attempts`
  );
  await delay(initialDelayMs);

  while (true) {
    try {
      console.log("[helper] Attempting to reconnect to Kindle over SSH");
      await kindle.connect();
      console.log("[helper] Reconnected to Kindle over SSH");
      break;
    } catch (e) {
      console.error("[helper] Reconnect attempt failed:", e.message || e);
      console.log(`[helper] Retrying in ${pollIntervalMs / 1000}s`);
      await delay(pollIntervalMs);
    }
  }
}

async function bootKindleAndLaunchBrowser(url, opts = {}) {
  const {
    launchDelayMs = 100 * 1000,
    initialDelayMs = 5 * 1000,
    pollIntervalMs = 5 * 1000,
    backlightLevel = 20,
  } = opts;

  console.log("[helper] Initiating Kindle UI launch");
  try {
    await startKindle();
    console.log("[helper] Kindle UI launch command sent");
  } catch (e) {
    console.error("[helper] Failed to start Kindle UI:", e.message || e);
  }

  console.log("[helper] Closing SSH session to allow Kindle UI boot");
  try {
    kindle.close();
  } catch (e) {
    console.error("[helper] Failed to close SSH session:", e.message || e);
  }

  await waitForKindleReconnect(initialDelayMs, pollIntervalMs);

  console.log(
    `[helper] Waiting ${launchDelayMs / 1000}s before starting browser`
  );
  await delay(launchDelayMs);

  console.log(`[helper] Launching browser at ${url}`);
  try {
    await startBrowser(url);
    console.log("[helper] Browser launch command sent");
  } catch (e) {
    console.error("[helper] Failed to launch browser:", e.message || e);
  }

  console.log("[helper] Waiting 5s before setting backlight");
  await delay(5 * 1000);

  console.log("[helper] Setting backlight to level", backlightLevel);
  try {
    await setBacklight(backlightLevel);
    console.log("[helper] Backlight adjustment request sent");
  } catch (e) {
    console.error("[helper] Failed to set daytime backlight:", e.message || e);
  }
  console.log("[helper] Disable Screensaver");
  try {
    await disableScreensaver();
  } catch (e) {
    console.error("[helper] Failed to disable screen saver", e.message || e);
  }
}

async function shutdownUI(opts = {}) {
  const { waitMs = 5000 } = opts;
  console.log("[helper] Running browser-mode shutdown steps");
  try {
    await setBacklight(0);
    console.log("[helper] Backlight dim command sent");
  } catch (e) {
    console.error(
      "[helper] Failed to dim backlight on shutdown:",
      e.message || e
    );
  }
  console.log(`[helper] Waiting ${waitMs / 1000}s after dimming backlight`);
  await delay(waitMs);
  try {
    await endBrowser();
    console.log("[helper] Browser stop command sent");
  } catch (e) {
    console.error(
      "[helper] Failed to stop the browser on shutdown:",
      e.message || e
    );
  }
  await delay(5 * 1000);
  try {
    await endKindle();
    console.log("[helper] Kindle UI stop command sent");
  } catch (e) {
    console.error(
      "[helper] Failed to stop Kindle UI on shutdown:",
      e.message || e
    );
  }
  console.log(`[helper] Waiting ${waitMs / 1000}s after stopping Kindle UI`);
  await delay(waitMs);

  console.log(`[helper] Waiting ${waitMs / 1000}s after stopping browser`);
  await delay(waitMs);

  try {
    await blackDisplay();
    console.log("[helper] Display black command sent");
  } catch (e) {
    console.error(
      "[helper] Failed to shut display on shutdown:",
      e.message || e
    );
  }
}

async function setTime(time) {
  await kindle.exec(
    `/mnt/us/usbnet/bin/fbink -q -m -y -3 -t regular=/mnt/us/fonts/InstrumentSerif-Regular.ttf,size=90,padding=HORIZONTAL "${time}"`
  );
}
async function clearTime() {
  await kindle.exec(
    "/mnt/us/usbnet/bin/fbink -s top=0,left=350,width=750,height=375 -W A2"
  );
}

async function refreshRegion() {
  await kindle.exec(
    "/mnt/us/usbnet/bin/fbink -q -k top=0,left=350,width=750,height=375 -B WHITE -f -W GC16"
  );
}

async function disableScreensaver() {
  await kindle.exec("lipc-set-prop com.lab126.powerd preventScreenSaver 1");
}

async function setBacklight(level) {
  await kindle.exec(
    `lipc-set-prop com.lab126.powerd flIntensity ${Number(level)}`
  );
}

async function setRotation(rotation) {
  await kindle.exec(
    `echo ${Number(rotation)} > /sys/class/graphics/fb0/rotate`
  );
}
async function startKindle() {
  await kindle.exec("reboot");
}
async function endKindle() {
  await kindle.exec("stop lab126_gui");
}
async function startBrowser(url) {
  const normalizedUrl =
    url.startsWith("http://") || url.startsWith("https://")
      ? url
      : `http://${url}`;
  const encodedUrl = encodeURIComponent(normalizedUrl);
  await kindle.exec(
    `lipc-set-prop com.lab126.appmgrd start app://com.lab126.browser?${encodedUrl}`
  );
}
async function endBrowser() {
  await kindle.exec("killall mesquite");
}
async function blackDisplay() {
  await kindle.exec("fbink -q -k -B BLACK");
}
async function refreshFramework() {
  await kindle.exec("restart framework");
}
module.exports = {
  setTime,
  clearTime,
  refreshRegion,
  setBacklight,
  setRotation,
  startKindle,
  startBrowser,
  endKindle,
  endBrowser,
  blackDisplay,
  waitForKindleReconnect,
  bootKindleAndLaunchBrowser,
  shutdownUI,
  refreshFramework,
};
