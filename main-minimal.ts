/// <reference no-default-lib="true" />
/// <reference lib="dom" />
/// <reference lib="dom.iterable" />
/// <reference lib="dom.asynciterable" />
/// <reference lib="deno.ns" />

console.log("🔄 Starting minimal Fresh app...");

try {
  const { start } = await import("$fresh/server.ts");
  const manifest = await import("./fresh.gen.ts");
  
  console.log("✅ Imports loaded, starting server...");
  
  await start(manifest.default, {
    plugins: [],
    server: {
      port: 8000,
      hostname: "0.0.0.0",
    },
  });
  
  console.log("🎉 Minimal server started successfully");
} catch (error) {
  console.error("❌ Minimal server failed:", error);
  Deno.exit(1);
} 