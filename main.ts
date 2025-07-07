/// <reference no-default-lib="true" />
/// <reference lib="dom" />
/// <reference lib="dom.iterable" />
/// <reference lib="dom.asynciterable" />
/// <reference lib="deno.ns" />

import "$std/dotenv/load.ts";

import { start } from "$fresh/server.ts";
import manifest from "./fresh.gen.ts";
import config from "./fresh.config.ts";

// Validate critical environment variables
function validateEnvironment() {
  const critical = [
    'SESSION_SECRET',
    'TWITTER_CLIENT_ID', 
    'TWITTER_CLIENT_SECRET'
  ];
  
  const missing = critical.filter(key => !Deno.env.get(key));
  
  if (missing.length > 0) {
    console.warn(`⚠️ Missing environment variables: ${missing.join(', ')}`);
    console.warn('🔧 App will start but some features may not work');
  }
  
  // Set defaults for non-critical variables
  if (!Deno.env.get("BLOCKCHAIN_NETWORK")) {
    Deno.env.set("BLOCKCHAIN_NETWORK", "testnet");
  }
  
  if (!Deno.env.get("ENABLE_DISCORD_NOTIFICATIONS")) {
    Deno.env.set("ENABLE_DISCORD_NOTIFICATIONS", "false");
  }
}

try {
  validateEnvironment();
  console.log("🍋 Starting Fresh server...");
  await start(manifest, config);
} catch (error) {
  console.error("❌ Failed to start server:", error);
  Deno.exit(1);
}
