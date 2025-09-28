const express = require("express");
const Redis = require("ioredis");

const app = express();
const redis = new Redis();

app.get("/alert", async (_req, res) => {
  try {
    const value = await redis.get("alert");
    if (value === null) {
      return res.status(404).json({ error: "alert key not found" });
    }
    try {
      const parsed = JSON.parse(value);
      return res.json({ key: "alert", value: parsed, type: "json" });
    } catch {
      return res.json({ key: "alert", value, type: "string" });
    }
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, "0.0.0.0", () => {
  console.log(`Listening on http://0.0.0.0:${PORT}`);
});
