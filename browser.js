import * as helper from "./helper.js";

const BROWSER_URL = "http://192.168.1.100:8001/";

async function start() {
  await helper.bootKindleAndLaunchBrowser(BROWSER_URL);
}

async function shutdown() {
  await helper.shutdownUI();
}

export { start, shutdown };
