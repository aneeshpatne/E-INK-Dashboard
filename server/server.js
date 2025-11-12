import express from "express";
import Redis from "ioredis";

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

app.get("/news_items", async (_req, res) => {
  try {
    const value = await redis.get("news_items");
    if (value === null) {
      return res.status(404).json({ error: "news_items key not found" });
    }

    let parsed;
    try {
      parsed = JSON.parse(value);
    } catch (e) {
      return res
        .status(500)
        .json({ error: "news_items value is not valid JSON" });
    }

    if (!Array.isArray(parsed) || parsed.length === 0) {
      return res
        .status(404)
        .json({ error: "news_items is empty or not an array" });
    }

    const idx = Math.floor(Math.random() * parsed.length);
    const selected = parsed[idx];
    return res.json({ key: "news_items", value: selected, type: "json" });
  } catch (err) {
    return res.status(500).json({ error: String(err) });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, "0.0.0.0", () => {
  console.log(`Listening on http://0.0.0.0:${PORT}`);
});
