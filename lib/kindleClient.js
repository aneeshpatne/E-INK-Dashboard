// lib/kindleClient.js
// Provides a KindleClient class to interact with a Kindle via SSH (fbink required on device).
// Responsibilities:
//  - connect/disconnect (maintains single SSH connection)
//  - run commands
//  - upload files
//  - clear & display PNG
//  - optional brightness control
//  - simple cycle counter (if provided stateFile)

const { Client } = require("ssh2");
const fs = require("fs");
const path = require("path");

class KindleClient {
  constructor(options = {}) {
    this.host = options.host || process.env.KINDLE_HOST || "192.168.1.109";
    this.user = options.user || "root";
    this.keyPath =
      options.keyPath ||
      process.env.KINDLE_KEY ||
      path.join(
        process.env.HOME || process.env.USERPROFILE,
        ".ssh",
        "id_ed25519"
      );
    this.fbink = options.fbink || "/mnt/us/usbnet/bin/fbink";
    this.stateFile = options.stateFile; // optional path for cycle counter
    this.hardFlashEvery = options.hardFlashEvery || 10;
    this.conn = null;
    this.connected = false;
  }

  async connect() {
    if (this.connected) return;
    if (!fs.existsSync(this.keyPath))
      throw new Error("SSH key not found at " + this.keyPath);
    this.conn = new Client();
    await new Promise((resolve, reject) => {
      this.conn
        .on("ready", () => {
          this.connected = true;
          resolve();
        })
        .on("error", (err) => {
          if (!this.connected) reject(err);
        })
        .connect({
          host: this.host,
          username: this.user,
          privateKey: fs.readFileSync(this.keyPath),
          readyTimeout: 15000,
        });
    });
  }

  async disconnect() {
    if (!this.connected) return;
    try {
      await this.run("lipc-set-prop com.lab126.powerd preventScreenSaver 0");
    } catch (_) {}
    this.conn.end();
    this.connected = false;
  }

  run(cmd) {
    if (!this.connected) return Promise.reject(new Error("not connected"));
    return new Promise((resolve, reject) => {
      this.conn.exec(cmd, (err, stream) => {
        if (err) return reject(err);
        let out = "",
          errOut = "";
        stream.on("data", (d) => (out += d.toString()));
        stream.stderr.on("data", (d) => (errOut += d.toString()));
        stream.on("close", (code) => {
          if (code === 0) return resolve(out.trim());
          reject(new Error(errOut || "exit " + code));
        });
      });
    });
  }

  async put(local, remote) {
    if (!this.connected) throw new Error("not connected");
    await new Promise((resolve, reject) => {
      this.conn.sftp((err, sftp) => {
        if (err) return reject(err);
        sftp.fastPut(local, remote, (e) => {
          sftp.end();
          if (e) return reject(e);
          resolve();
        });
      });
    });
  }

  _nextCount() {
    if (!this.stateFile) return 1; // treat as always 1 so hardFlashEvery logic still workable
    let count = 0;
    if (fs.existsSync(this.stateFile))
      count = parseInt(fs.readFileSync(this.stateFile, "utf8")) || 0;
    count += 1;
    fs.writeFileSync(this.stateFile, String(count));
    return count;
  }

  async prepareSession() {
    await this.run("lipc-set-prop com.lab126.powerd preventScreenSaver 1");
  }

  async displayPng(localPath, remotePath = "/tmp/dashboard.png") {
    const count = this._nextCount();
    const clear =
      count % this.hardFlashEvery === 0
        ? `${this.fbink} -q --clear --flash`
        : `${this.fbink} -q --clear`;
    await this.run(clear);
    await this.put(localPath, remotePath);
    await this.run(`${this.fbink} -q -i ${remotePath}`);
  }

  async setBrightness(level) {
    level = Math.max(0, Math.min(24, parseInt(level, 10) || 0));
    await this.run(`lipc-set-prop com.lab126.powerd flIntensity ${level}`);
  }
}

module.exports = { KindleClient };
