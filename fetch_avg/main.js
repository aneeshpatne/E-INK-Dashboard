import { createClient } from "redis";

const redis = await createClient()
  .on("error", (err) => console.log("Redis Client Error", err))
  .connect();

const value = await client.get("changes");

const data = await value.json();

console.log(data);
