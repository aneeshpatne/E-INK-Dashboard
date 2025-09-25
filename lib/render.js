// lib/render.js
// Renders an HTML dashboard to a PNG sized for Kindle PW3.
// Exports a single function renderDashboard(options): Promise<string>
// Options:
//   html (string) path to HTML file (required)
//   out  (string) output PNG path (optional, default dashboard.png next to html)
//   width, height (numbers) override viewport size (default 1072x1448)
//   delay (ms) small extra wait after load (default 150)
// Returns resolved output path.

const path = require("path");
const fs = require("fs");
const puppeteer = require("puppeteer");

const DEFAULT_WIDTH = 1072;
const DEFAULT_HEIGHT = 1448;

async function renderDashboard({
  html,
  out,
  width = DEFAULT_WIDTH,
  height = DEFAULT_HEIGHT,
  delay = 150,
} = {}) {
  if (!html) throw new Error("html path required");
  const htmlAbs = path.resolve(html);
  if (!fs.existsSync(htmlAbs)) throw new Error("HTML not found: " + htmlAbs);
  const outPath = path.resolve(
    out || path.join(path.dirname(htmlAbs), "dashboard.png")
  );

  const browser = await puppeteer.launch({
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });
  try {
    const page = await browser.newPage();
    await page.setViewport({ width, height, deviceScaleFactor: 1 });
    await page.goto("file://" + htmlAbs, {
      waitUntil: "networkidle0",
      timeout: 60000,
    });
    if (delay) await new Promise((r) => setTimeout(r, delay));
    await page.screenshot({
      path: outPath,
      clip: { x: 0, y: 0, width, height },
    });
  } finally {
    await browser.close();
  }
  return outPath;
}

module.exports = { renderDashboard, DEFAULT_WIDTH, DEFAULT_HEIGHT };
