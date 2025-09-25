const { Client } = require("ssh2");
const fs = require("fs");
const path = require("path");

async function runSSH(cmd) {
  const conn = new Client();
  const keyPath = path.join(
    process.env.HOME || process.env.USERPROFILE,
    ".ssh",
    "id_ed25519"
  );

  return new Promise((resolve, reject) => {
    conn
      .on("ready", () => {
        conn.exec(`sh -lc ${JSON.stringify(cmd)}`, (err, stream) => {
          // shell-wrap avoids "Unable to exec" on BusyBox/Dropbear
          if (err) return reject(err);
          let out = "",
            errOut = "";
          stream.on("data", (d) => (out += d.toString()));
          stream.stderr.on("data", (d) => (errOut += d.toString()));
          stream.on("close", (code) => {
            conn.end();
            code === 0
              ? resolve(out.trim())
              : reject(new Error(errOut || `exit ${code}`));
          });
        });
      })
      .on("error", reject)
      .connect({
        host: "192.168.1.109", // your Kindle IP
        username: "root",
        privateKey: fs.readFileSync(keyPath),
        readyTimeout: 15000,
      });
  });
}

// usage:
runSSH('/mnt/us/usbnet/bin/fbink -q -m -M -S 6 "Hello from JS"')
  .then(console.log)
  .catch(console.error);
