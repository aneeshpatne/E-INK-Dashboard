import { readdirSync, statSync, readFileSync } from "fs";
import { join } from "path";
import { connect, exec, close } from "../connect.js";
import { flashClearDisplay } from "../helper.js";

function traverseDirectory(dirPath) {
  try {
    const items = readdirSync(dirPath);
    items.forEach((item) => {
      const fullPath = join(dirPath, item);
      const stat = statSync(fullPath);
      if (!stat.isDirectory()) {
        const base64 = readFileSync(fullPath, { encoding: "base64" });
        console.log(`File: ${fullPath}`);
        console.log(`Base64: ${base64}`);
        console.log("---");
      }
    });
  } catch (error) {
    console.error(`Error traversing directory: ${error.message}`);
  }
}

async function sendImage() {
  await flashClearDisplay();
}

async function main() {
  try {
    console.log("Connecting to Kindle...");
    await connect();
    console.log("Connected!");

    const imageDir = join(process.cwd(), ".", "image");
    traverseDirectory(imageDir);
    await sendImage();

    console.log("Done!");
  } catch (err) {
    console.error("Error:", err);
  } finally {
    close();
  }
}

main();
