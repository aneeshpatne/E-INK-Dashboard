const helper = require("./helper");
const kindle = require("./connect");

function getTimeString() {
  const now = new Date();
  const utc = now.getTime() + now.getTimezoneOffset() * 60000;
  const ist = new Date(utc + 5.5 * 60 * 60 * 1000);
  const h = ist.getHours();
  const h12 = ((h + 11) % 12) + 1;
  const m = ist.getMinutes().toString().padStart(2, "0");
  return `${h12}:${m}`;
}

async function updateTime() {
  try {
    await helper.clearTime();
    await helper.setTime(getTimeString());
  } catch (e) {
    console.error("Update failed:", e.message || e);
  }
}

function msUntilNextMinute() {
  const now = Date.now();
  return 60000 - (now % 60000);
}

(async () => {
  await kindle.connect();
  await updateTime();
  setTimeout(() => {
    updateTime();
    setInterval(updateTime, 60000);
  }, msUntilNextMinute());
})();

function shutdown() {
  try {
    kindle.close();
  } catch (_) {}
  process.exit(0);
}
process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
