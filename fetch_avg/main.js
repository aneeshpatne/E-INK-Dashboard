import { createClient } from "redis";
import puppeteer from "puppeteer";
import fs from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const WIDTH = 1448;
const HEIGHT = 1072;

const redis = await createClient()
  .on("error", (err) => console.log("Redis Client Error", err))
  .connect();

const rawValue = await redis.get("changes");
const data = rawValue ? JSON.parse(rawValue) : {};

if (!rawValue) {
  console.warn("No redis data found for key 'changes'. Rendering empty cards.");
}

const metrics = [
  {
    title: "Temperature",
    subtitle: "Indoor climate trend",
    change: toNumber(data.temp_change),
    percentChange: toNumber(data.temp_percent_change),
    unit: "°C",
    percentSuffix: "%",
    icon: "🌡️",
    fileName: "image/temperature.png",
  },
  {
    title: "Humidity",
    subtitle: "Ambient balance",
    change: toNumber(data.humidity_change),
    percentChange: toNumber(data.humidity_percent_change),
    unit: "%",
    percentSuffix: "%",
    icon: "💧",
    fileName: "image/humidity.png",
  },
  {
    title: "Pressure",
    subtitle: "Atmospheric shift",
    change: toNumber(data.pressure_change),
    percentChange: toNumber(data.pressure_percent_change),
    unit: " hPa",
    percentSuffix: "%",
    icon: "🌪️",
    fileName: "image/pressure.png",
  },
];

// Generate all metric cards
const browser = await puppeteer.launch({
  headless: true,
  args: ["--no-sandbox", "--disable-setuid-sandbox"],
});

for (const metric of metrics) {
  await generateMetricCard(browser, metric);
  console.log(`Created ${metric.fileName}`);
}

await browser.close();
await redis.quit();

async function generateMetricCard(browser, metricData) {
  const page = await browser.newPage();
  await page.setViewport({ width: WIDTH, height: HEIGHT });

  const templatePath = `file://${join(__dirname, "template.html")}`;
  await page.goto(templatePath, { waitUntil: "networkidle0" });

  // Inject the data and update the card
  const timestamp = new Date().toISOString().replace("T", " ").slice(0, 19);
  await page.evaluate((data) => {
    window.metricData = {
      ...data,
      timestamp: new Date().toISOString().replace("T", " ").slice(0, 19),
    };
    updateCard(window.metricData);
  }, metricData);

  // Take screenshot
  const screenshot = await page.screenshot({
    type: "png",
    omitBackground: false,
  });

  fs.writeFileSync(metricData.fileName, screenshot);
  await page.close();
}

function toNumber(value) {
  if (value === null || value === undefined) return null;
  const num = Number(value);
  return Number.isFinite(num) ? num : null;
}
