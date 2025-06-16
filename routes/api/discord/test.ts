import { Handlers } from "$fresh/server.ts";
import { testDiscordWebhook } from "../../../utils/discord.ts";

export const handler: Handlers = {
  async POST() {
    try {
      console.log("🧪 Testing Discord webhook configuration...");
      
      const success = await testDiscordWebhook();
      
      if (success) {
        return new Response(JSON.stringify({ 
          success: true, 
          message: "Discord webhook test successful! Check your Discord channel for the test message." 
        }), {
          headers: { "Content-Type": "application/json" },
        });
      } else {
        return new Response(JSON.stringify({ 
          success: false, 
          error: "Discord webhook test failed. Check your configuration and logs." 
        }), {
          status: 500,
          headers: { "Content-Type": "application/json" },
        });
      }
    } catch (error) {
      console.error("❌ Discord webhook test error:", error);
      return new Response(JSON.stringify({ 
        success: false, 
        error: `Discord webhook test failed: ${error instanceof Error ? error.message : "Unknown error"}` 
      }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });
    }
  },
}; 