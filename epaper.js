#!/usr/bin/env node
/**
 * Orchestrator script: renders dashboard then sends to Kindle.
 * The actual logic now lives in:
 *   lib/render.js        (renderDashboard)
 *   lib/kindleClient.js  (KindleClient)
 * This keeps epaper.js as a simple CLI you can replace or extend.
 */

const path = require("path");
const fs = require("fs");
const {
  renderDashboard,
  DEFAULT_WIDTH,
  DEFAULT_HEIGHT,
} = require("./lib/render");
const { KindleClient } = require("./lib/kindleClient");

const HTML = path.resolve(__dirname, "dashboard.html");
const OUT = path.resolve(__dirname, "dashboard.png");
const STATE = path.resolve(__dirname, ".count");

async function main() {
  console.log("--- e-paper pipeline (modular) ---");
  // 1. Render
  console.log("Rendering HTML → PNG");
  const pngPath = await renderDashboard({
    html: HTML,
    out: OUT,
    width: DEFAULT_WIDTH,
    height: DEFAULT_HEIGHT,
  });
  console.log("Rendered:", pngPath);

  // 2. Send to Kindle
  const kindle = new KindleClient({ stateFile: STATE, hardFlashEvery: 10 });
  await kindle.connect();
  try {
    await kindle.prepareSession();
    await kindle.displayPng(pngPath);
    if (process.env.BRIGHT !== undefined) {
      await kindle.setBrightness(process.env.BRIGHT);
      console.log("Brightness applied");
    }
    console.log("Done ✅");
  } catch (e) {
    console.error("Error:", e.message);
  } finally {
    await kindle.disconnect();
  }
}

if (require.main === module) {
  main().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}

module.exports = { main };
