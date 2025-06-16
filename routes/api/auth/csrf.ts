import { Handlers } from "$fresh/server.ts";
import { generateCSRFToken } from "../../../utils/security.ts";

export const handler: Handlers = {
  async GET(req) {
    try {
      // Check authentication first
      const cookies = req.headers.get("cookie") || "";
      const sessionCookie = cookies.split(";").find(c => c.trim().startsWith("twitter_session="));
      
      if (!sessionCookie) {
        return new Response(JSON.stringify({ error: "Not authenticated" }), {
          status: 401,
          headers: { "Content-Type": "application/json" },
        });
      }

      // Generate CSRF token
      const csrfToken = generateCSRFToken();
      
      return new Response(JSON.stringify({ 
        csrfToken,
        timestamp: Date.now()
      }), {
        headers: { "Content-Type": "application/json" },
      });
    } catch (error) {
      console.error("❌ CSRF token generation error:", error);
      return new Response(JSON.stringify({ error: "Failed to generate CSRF token" }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });
    }
  },
}; 