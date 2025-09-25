const puppeteer = require("puppeteer");
const path = require("path");

const WIDTH = 1072; // Kindle PW3 width
const HEIGHT = 1448; // Kindle PW3 height
const OUT = path.resolve(__dirname, "dashboard.png");
const HTML = path.resolve(__dirname, "dashboard.html");

(async () => {
  const browser = await puppeteer.launch({ args: ["--no-sandbox"] });
  const page = await browser.newPage();
  await page.setViewport({
    width: WIDTH,
    height: HEIGHT,
    deviceScaleFactor: 1,
  });

  await page.goto("file://" + HTML, { waitUntil: "networkidle0" });
  await new Promise((r) => setTimeout(r, 150)); // tiny pause

  await page.screenshot({
    path: OUT,
    clip: { x: 0, y: 0, width: WIDTH, height: HEIGHT },
  });

  await browser.close();
  console.log("Rendered to", OUT);
})();
