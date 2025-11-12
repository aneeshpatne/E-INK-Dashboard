import { readdirSync, statSync } from "fs";
import { join } from "path";
import * as kindle from "../connect.js";
import * as helper from "../helper.js";

function traverseDirectory(dirPath) {
  try {
    const items = readdirSync(dirPath);
    items.forEach((item) => {
      const fullPath = join(dirPath, item);
      const stat = statSync(fullPath);
      if (!stat.isDirectory()) {
        console.log(fullPath);
      }
    });
  } catch (error) {
    console.error(`Error traversing directory: ${error.message}`);
  }
}

async function sendImage() {
  await helper.blackDisplay();
}

async function main() {
  const imageDir = join(process.cwd(), ".", "image");
  traverseDirectory(imageDir);
  await sendImage();
}

main().catch((err) => console.error(err));
