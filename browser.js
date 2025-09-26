const helper = require("./helper");

const BROWSER_URL = "http://192.168.1.36:8000";

async function start() {
  await helper.bootKindleAndLaunchBrowser(BROWSER_URL);
}

async function shutdown() {
  await helper.shutdownUI();
}

module.exports = { start, shutdown };
