const { readdirSync, statSync } = require("fs");
const { join } = require("path");
const kindle = require("../connect");
const helper = require("../helper");

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
