#!/usr/bin/env node
/**
 * Kindle Paperwhite 3: auto pipeline
 *   - render ./dashboard.html -> ./dashboard.png
 *   - ssh to Kindle
 *   - clear (quick or full flash every 10th run)
 *   - upload & display
 *   - (optional) set brightness via BRIGHT env var
 *
 * usage:
 *   node epaper.js
 *
 * config via env vars:
 *   KINDLE_HOST   (default 192.168.1.109)
 *   KINDLE_KEY    (default ~/.ssh/id_ed25519)
 *   BRIGHT        (0–24, optional frontlight intensity)
 */

const fs = require("fs");
const path = require("path");
const { Client } = require("ssh2");
const puppeteer = require("puppeteer");

const HOST = process.env.KINDLE_HOST || "192.168.1.109";
const KEY_PATH =
  process.env.KINDLE_KEY ||
  path.join(process.env.HOME || process.env.USERPROFILE, ".ssh", "id_ed25519");
const FBINK = "/mnt/us/usbnet/bin/fbink";

// Kindle PW3 resolution
const WIDTH = 1072;
const HEIGHT = 1448;

const HTML = path.resolve(__dirname, "dashboard.html");
const OUT = path.resolve(__dirname, "dashboard.png");
const STATE = path.resolve(__dirname, ".count");

(async () => {
  if (!fs.existsSync(HTML)) {
    console.error("dashboard.html not found at", HTML);
    process.exit(1);
  }
  if (!fs.existsSync(KEY_PATH)) {
    console.error("SSH key not found at", KEY_PATH);
    process.exit(1);
  }

  // ---- Step 1: render HTML → PNG
  console.log("Rendering", HTML, "→", OUT);
  const browser = await puppeteer.launch({
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });
  const page = await browser.newPage();
  await page.setViewport({
    width: WIDTH,
    height: HEIGHT,
    deviceScaleFactor: 1,
  });
  await page.goto("file://" + HTML, {
    waitUntil: "networkidle0",
    timeout: 60000,
  });
  await new Promise((r) => setTimeout(r, 150)); // tiny pause for DOM
  await page.screenshot({
    path: OUT,
    clip: { x: 0, y: 0, width: WIDTH, height: HEIGHT },
  });
  await browser.close();
  console.log("PNG saved:", OUT);

  // ---- Step 2: connect SSH
  console.log("Connecting to Kindle @", HOST);
  const conn = new Client();

  const run = (cmd) =>
    new Promise((resolve, reject) => {
      conn.exec(cmd, (err, stream) => {
        if (err) return reject(err);
        let out = "",
          errOut = "";
        stream.on("data", (d) => (out += d.toString()));
        stream.stderr.on("data", (d) => (errOut += d.toString()));
        stream.on("close", (code) => {
          if (code === 0) return resolve(out.trim());
          reject(new Error(errOut || `exit ${code}`));
        });
      });
    });

  const put = (local, remote) =>
    new Promise((resolve, reject) => {
      conn.sftp((err, sftp) => {
        if (err) return reject(err);
        sftp.fastPut(local, remote, (e) => {
          sftp.end();
          if (e) return reject(e);
          resolve();
        });
      });
    });

  conn
    .on("ready", async () => {
      try {
        await run("lipc-set-prop com.lab126.powerd preventScreenSaver 1");

        // read/update counter for flash cycle
        let count = 0;
        if (fs.existsSync(STATE))
          count = parseInt(fs.readFileSync(STATE, "utf8")) || 0;
        count++;
        fs.writeFileSync(STATE, String(count));

        const clearCmd =
          count % 10 === 0
            ? `${FBINK} -q --clear --flash`
            : `${FBINK} -q --clear`;
        console.log("Clearing screen…");
        await run(clearCmd);

        console.log("Uploading PNG…");
        await put(OUT, "/tmp/dashboard.png");

        console.log("Displaying…");
        await run(`${FBINK} -q -i /tmp/dashboard.png`);

        if (process.env.BRIGHT !== undefined) {
          const level = Math.max(
            0,
            Math.min(24, parseInt(process.env.BRIGHT, 10) || 0)
          );
          await run(`lipc-set-prop com.lab126.powerd flIntensity ${level}`);
          console.log("Brightness set to", level);
        }

        console.log("Done ✅");
      } catch (e) {
        console.error("Error:", e.message);
      } finally {
        try {
          await run("lipc-set-prop com.lab126.powerd preventScreenSaver 0");
        } catch (_) {}
        conn.end();
        process.exit(0);
      }
    })
    .on("error", (err) => {
      console.error("SSH error:", err.message);
      process.exit(1);
    });

  conn.connect({
    host: HOST,
    username: "root",
    privateKey: fs.readFileSync(KEY_PATH),
    readyTimeout: 15000,
  });
})();
