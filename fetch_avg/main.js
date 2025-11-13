import { createClient } from "redis";
import puppeteer from "puppeteer";
import fs from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const SENSOR_URL = "http://192.168.1.50/sensors_v2";

export async function generatePNGs() {
  const WIDTH = 1448;
  const HEIGHT = 1072;

  async function generateMetricCard(browser, metricData) {
    const page = await browser.newPage();
    await page.setViewport({ width: WIDTH, height: HEIGHT });

    const templatePath = `file://${join(__dirname, "template.html")}`;
    await page.goto(templatePath, { waitUntil: "networkidle0" });

    // Inject the data and update the card
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

    fs.writeFileSync(join(__dirname, metricData.fileName), screenshot);
    await page.close();
  }

  // Fetch current sensor data
  let currentData = null;
  try {
    const response = await fetch(SENSOR_URL);
    currentData = await response.json();
    console.log("Fetched current sensor data:", currentData);
  } catch (error) {
    console.error("Failed to fetch sensor data:", error);
  }

  const redis = await createClient()
    .on("error", (err) => console.log("Redis Client Error", err))
    .connect();

  const rawValue = await redis.get("changes");
  const data = rawValue ? JSON.parse(rawValue) : {};

  if (!rawValue) {
    console.warn(
      "No redis data found for key 'changes'. Rendering empty cards."
    );
  }

  // Helper to determine if change is significant based on percent change
  const isSignificant = (percentChange) => {
    if (percentChange === null || percentChange === undefined) return false;
    return Math.abs(percentChange) >= 5; // 5% threshold for significance
  };

  const metrics = [
    {
      title: "Temperature",
      subtitle: "Indoor climate trend",
      change: toNumber(data.temp_change),
      percentChange: toNumber(data.temp_percent_change),
      currentValue: currentData?.temp_c ?? null,
      unit: "°C",
      icon: "🌡️",
      fileName: "image/temperature.png",
      isSignificant: isSignificant(toNumber(data.temp_percent_change)),
    },
    {
      title: "Humidity",
      subtitle: "Ambient balance",
      change: toNumber(data.humidity_change),
      percentChange: toNumber(data.humidity_percent_change),
      currentValue: currentData?.humidity_pct ?? null,
      unit: "%",
      icon: "💧",
      fileName: "image/humidity.png",
      isSignificant: isSignificant(toNumber(data.humidity_percent_change)),
    },
    {
      title: "Pressure",
      subtitle: "Atmospheric shift",
      change: toNumber(data.pressure_change),
      percentChange: toNumber(data.pressure_percent_change),
      currentValue: currentData?.pressure_hpa ?? null,
      unit: " hPa",
      icon: "🌪️",
      fileName: "image/pressure.png",
      isSignificant: isSignificant(toNumber(data.pressure_percent_change)),
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
}

function toNumber(value) {
  if (value === null || value === undefined) return null;
  const num = Number(value);
  return Number.isFinite(num) ? num : null;
}
