/// <reference no-default-lib="true" />
/// <reference lib="dom" />
/// <reference lib="dom.iterable" />
/// <reference lib="dom.asynciterable" />
/// <reference lib="deno.ns" />

import "$std/dotenv/load.ts";
import { start } from "$fresh/server.ts";
import manifest from "./fresh.gen.ts";
import config from "./fresh.config.ts";

// Set minimal environment defaults to prevent startup failures
if (!Deno.env.get("SESSION_SECRET")) {
  Deno.env.set("SESSION_SECRET", "fallback-session-secret-for-deployment");
}

if (!Deno.env.get("BLOCKCHAIN_NETWORK")) {
  Deno.env.set("BLOCKCHAIN_NETWORK", "testnet");
}

if (!Deno.env.get("ENABLE_DISCORD_NOTIFICATIONS")) {
  Deno.env.set("ENABLE_DISCORD_NOTIFICATIONS", "false");
}

console.log("🍋 Starting Fresh server...");

await start(manifest, config);
