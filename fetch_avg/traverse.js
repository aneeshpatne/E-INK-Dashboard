import { readdirSync, statSync, readFileSync, writeFileSync } from "fs";
import { join } from "path";
import { tmpdir } from "os";
import { connect, exec, put, close } from "../connect.js";
import { flashClearDisplay, setRotation } from "../helper.js";

async function traverseDirectory(dirPath) {
  try {
    const items = readdirSync(dirPath);
    for (const item of items) {
      const fullPath = join(dirPath, item);
      const stat = statSync(fullPath);
      if (!stat.isDirectory()) {
        const base64 = readFileSync(fullPath, { encoding: "base64" });
        await sendImage(base64);
        await new Promise((res) => setTimeout(res, 10000));
        console.log("---");
      }
    }
  } catch (error) {
    console.error(`Error traversing directory: ${error.message}`);
  }
}

async function sendImage(base64) {
  try {
    // Decode base64 to buffer
    await flashClearDisplay();
    const imageBuffer = Buffer.from(base64, "base64");

    // Create temporary file
    const tempFile = join(tmpdir(), `image_${Date.now()}.png`);
    writeFileSync(tempFile, imageBuffer);

    // Upload to Kindle
    const remotePath = `/tmp/display_image.png`;
    await put(tempFile, remotePath);

    // Display the image using fbink
    await exec(`/mnt/us/usbnet/bin/fbink -q -c -g file=${remotePath}`);

    console.log(`Displayed image: ${remotePath}`);
  } catch (error) {
    console.error(`Failed to send image: ${error.message}`);
  }
}

async function main() {
  try {
    console.log("Connecting to Kindle...");
    await connect();
    console.log("Connected!");
    await setRotation(3);
    const imageDir = join(process.cwd(), ".", "image");
    await traverseDirectory(imageDir);

    console.log("Done!");
  } catch (err) {
    console.error("Error:", err);
  } finally {
    await setRotation(0);
    close();
  }
}

main();
