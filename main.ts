/// <reference no-default-lib="true" />
/// <reference lib="dom" />
/// <reference lib="dom.iterable" />
/// <reference lib="dom.asynciterable" />
/// <reference lib="deno.ns" />

// Load environment variables
try {
  await import("$std/dotenv/load.ts");
  console.log("✅ Environment variables loaded");
} catch (error) {
  console.warn("⚠️ Failed to load .env file:", error);
}

// Import Fresh components
console.log("🔄 Loading Fresh components...");
const { start } = await import("$fresh/server.ts");
const manifest = await import("./fresh.gen.ts");
const config = await import("./fresh.config.ts");
console.log("✅ Fresh components loaded");

// Set minimal defaults for critical environment variables
if (!Deno.env.get("SESSION_SECRET")) {
  Deno.env.set("SESSION_SECRET", "fallback-secret-for-demo-only");
  console.warn("⚠️ Using fallback SESSION_SECRET");
}

if (!Deno.env.get("BLOCKCHAIN_NETWORK")) {
  Deno.env.set("BLOCKCHAIN_NETWORK", "testnet");
}

if (!Deno.env.get("ENABLE_DISCORD_NOTIFICATIONS")) {
  Deno.env.set("ENABLE_DISCORD_NOTIFICATIONS", "false");
}

console.log("🍋 Starting Fresh server...");

// Start the server with timeout protection
const startPromise = start(manifest.default, config.default);
const timeoutPromise = new Promise((_, reject) => {
  setTimeout(() => reject(new Error("Server startup timeout after 30 seconds")), 30000);
});

try {
  await Promise.race([startPromise, timeoutPromise]);
  console.log("🎉 Server started successfully");
} catch (error) {
  console.error("❌ Server startup failed:", error);
  console.error("Stack trace:", error instanceof Error ? error.stack : "No stack trace");
  
  // Try to provide more info about the environment
  console.error("Environment info:", {
    denoVersion: Deno.version,
    platform: Deno.build,
    cwd: Deno.cwd(),
    env: {
      NODE_ENV: Deno.env.get("NODE_ENV"),
      DENO_DEPLOYMENT_ID: Deno.env.get("DENO_DEPLOYMENT_ID"),
      DENO_REGION: Deno.env.get("DENO_REGION"),
    }
  });
  
  Deno.exit(1);
}
