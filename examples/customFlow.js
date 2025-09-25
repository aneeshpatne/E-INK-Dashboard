#!/usr/bin/env node
// Example of building your own custom logic using the new modules.
// This script renders only if the minute changed & demonstrates conditional flows.

const path = require("path");
const { renderDashboard } = require("../lib/render");
const { KindleClient } = require("../lib/kindleClient");

(async () => {
  const kindle = new KindleClient({
    stateFile: path.resolve(__dirname, "..", ".count"),
  });
  await kindle.connect();
  try {
    await kindle.prepareSession();
    const now = new Date();
    if (now.getSeconds() < 5) {
      // arbitrary condition
      const out = await renderDashboard({
        html: path.resolve(__dirname, "..", "dashboard.html"),
      });
      await kindle.displayPng(out);
    } else {
      console.log("Skipping render this cycle");
    }
  } finally {
    await kindle.disconnect();
  }
})();
