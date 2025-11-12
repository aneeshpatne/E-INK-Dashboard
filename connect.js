// kindle.js
import { Client } from "ssh2";
import fs from "fs";
import path from "path";

const host = "192.168.1.10"; // your Kindle IP
const user = "root";
const keyPath = path.join(process.env.HOME, ".ssh", "id_ed25519");

let conn;

/**
 * Connect once and reuse this conn.
 */
function connect() {
  return new Promise((resolve, reject) => {
    conn = new Client();
    conn
      .on("ready", () => resolve(conn))
      .on("error", reject)
      .connect({
        host,
        username: user,
        privateKey: fs.readFileSync(keyPath),
      });
  });
}

/**
 * Run a command on Kindle.
 */
function exec(cmd) {
  return new Promise((resolve, reject) => {
    const wrapped = `sh -lc ${JSON.stringify(cmd)}`;
    conn.exec(wrapped, (err, stream) => {
      if (err) return reject(err);
      let out = "",
        errOut = "";
      stream.on("data", (d) => (out += d.toString()));
      stream.stderr.on("data", (d) => (errOut += d.toString()));
      stream.on("close", (code) => {
        code === 0
          ? resolve(out.trim())
          : reject(new Error(errOut || `exit ${code}`));
      });
    });
  });
}

/**
 * Upload a file to Kindle via SFTP.
 */
function put(local, remote) {
  return new Promise((resolve, reject) => {
    conn.sftp((err, sftp) => {
      if (err) return reject(err);
      sftp.fastPut(local, remote, (e) => {
        sftp.end();
        e ? reject(e) : resolve();
      });
    });
  });
}

/**
 * Close the connection.
 */
function close() {
  if (conn) conn.end();
}

export { connect, exec, put, close };
