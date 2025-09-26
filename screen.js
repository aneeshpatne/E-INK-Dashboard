// fetch is used below; time helpers are not needed for alerts

function createLegacyClockScreen({ helper, kindle }) {
  let isRunning = false;
  let isShuttingDown = false;

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

    // regional refresh removed per request
  }

  // Fetch the alert JSON locally (not on the Kindle) using global fetch
  async function fetchAlert() {
    const url = "http://192.168.1.100:3000/alert";
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Fetch failed: ${res.status}`);
    return res.json();
  }

  // Paint the alert onto the Kindle display via fbink (executed on Kindle)
  async function paintAlert(alertJson) {
    try {
      if (!alertJson || !alertJson.value || !alertJson.value.message) {
        throw new Error("Invalid alert payload");
      }
      const rawMsg = String(alertJson.value.message || "");
      const msg = rawMsg.replace(/"/g, '\\"');
      const rawColor = String(alertJson.value.color || "");
      const colorLabel = rawColor.toUpperCase();

      console.log("[screen] Painting alert, color:", rawColor);

      const colorCmd = `/mnt/us/usbnet/bin/fbink -q -t regular=/mnt/us/fonts/InstrumentSerif-Regular.ttf,px=300,top=0,left=0,right=0,bottom=0 -m "${colorLabel} ALERT"`;
      const messageCmd = `/mnt/us/usbnet/bin/fbink -q -t regular=/mnt/us/fonts/InstrumentSerif-Regular.ttf,px=150,top=300,left=0,right=0,bottom=0 -m "${msg}"`;

      await kindle.exec(colorCmd);
      // small pause to ensure Kindle processes first region before drawing next one
      await new Promise((r) => setTimeout(r, 250));
      await kindle.exec(messageCmd);

      // Regional refresh removed per request
    } catch (e) {
      console.error("Failed to paint alert:", e.message || e);
      throw e;
    }
  }

  async function start() {
    if (isRunning) return;
    isRunning = true;

    await initialiseDisplay();

    try {
      const alertJson = await fetchAlert();
      console.log("[screen] Alert fetched:", JSON.stringify(alertJson));
      await paintAlert(alertJson);
    } catch (e) {
      console.error("[screen] Failed to fetch or paint alert:", e.message || e);
    }
  }

  async function shutdown() {
    if (!isRunning || isShuttingDown) return;
    isShuttingDown = true;

    // try {
    //   await helper.setBacklight(0);
    // } catch (e) {
    //   console.error("Failed to dim backlight on shutdown:", e.message || e);
    // }

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
