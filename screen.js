// fetch is used below; time helpers are not needed for alerts

function createLegacyClockScreen({ helper, kindle }) {
  let isRunning = false;
  let isShuttingDown = false;

  async function initialiseDisplay() {
    try {
      await kindle.exec("/mnt/us/usbnet/bin/fbink -q -k -B WHITE -f -W GC16");
    } catch (e) {
      console.error("Failed to clear display on startup:", e.message || e);
    }
    try {
      await helper.setRotation(0);
    } catch (e) {
      console.error("Failed to set rotation on startup:", e.message || e);
    }

    try {
      await helper.setBacklight(24);
    } catch (e) {
      console.error("Failed to change backlight on shutdown:", e.message || e);
    }
  }

  async function fetchAlert() {
    const url = "http://192.168.1.100:3000/alert";
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Fetch failed: ${res.status}`);
    return res.json();
  }
  async function fetchNews() {
    const url = "http://192.168.1.100:3000/news_items";
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Fetch news failed: ${res.status}`);
    return res.json();
  }
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
      await new Promise((r) => setTimeout(r, 250));
      await kindle.exec(messageCmd);
    } catch (e) {
      console.error("Failed to paint alert:", e.message || e);
      throw e;
    }
  }

  async function paintNews(newsJson) {
    try {
      if (
        !newsJson ||
        !newsJson.value ||
        !newsJson.value.title ||
        !newsJson.value.summary
      ) {
        throw new Error("Invalid news payload");
      }

      const title = String(newsJson.value.title || "").replace(/"/g, '\\"');
      const summary = String(newsJson.value.summary || "").replace(/"/g, '\\"');

      console.log("[screen] Painting news, title:", title);

      // Title (larger, top)
      const titleCmd = `/mnt/us/usbnet/bin/fbink -q -t regular=/mnt/us/fonts/InstrumentSerif-Regular.ttf,px=200,top=0,left=0,right=0,bottom=0 -m "${title}"`;
      // Summary (smaller, lower on the screen)
      const summaryCmd = `/mnt/us/usbnet/bin/fbink -q -t regular=/mnt/us/fonts/InstrumentSerif-Regular.ttf,px=150,top=500,left=0,right=0,bottom=0 -m "${summary}"`;

      await kindle.exec(titleCmd);
      await new Promise((r) => setTimeout(r, 250));
      await kindle.exec(summaryCmd);
    } catch (e) {
      console.error("Failed to paint news:", e.message || e);
      throw e;
    }
  }

  async function start(screenType = "alert") {
    if (isRunning) return;
    isRunning = true;

    await initialiseDisplay();
    await new Promise((res) => setTimeout(res, 5 * 1000));
    // screenType can be 'alert' or 'news' (default 'alert')
    const type = screenType || "alert";
    try {
      if (type === "news") {
        const newsJson = await fetchNews();
        console.log("[screen] News fetched:", JSON.stringify(newsJson));
        await paintNews(newsJson);
      } else {
        const alertJson = await fetchAlert();
        console.log("[screen] Alert fetched:", JSON.stringify(alertJson));
        await paintAlert(alertJson);
      }
    } catch (e) {
      console.error(
        "[screen] Failed to fetch or paint screen content:",
        e.message || e
      );
    }
  }

  async function shutdown() {
    if (!isRunning || isShuttingDown) return;
    isShuttingDown = true;

    try {
      await helper.setBacklight(20);
    } catch (e) {
      console.error("Failed to change backlight on shutdown:", e.message || e);
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
