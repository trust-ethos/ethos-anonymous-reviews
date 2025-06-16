import { Handlers } from "$fresh/server.ts";

interface TwitterUser {
  id: string;
  name: string;
  username: string;
  profileImageUrl?: string;
}

interface TwitterSession {
  user: TwitterUser;
  accessToken: string;
  expiresAt: number;
}

export const handler: Handlers = {
  GET(req) {
    console.log("🔍 Checking authentication status...");
    
    try {
      // Get session cookie
      const cookies = req.headers.get("cookie") || "";
      console.log("🍪 Cookies received:", cookies ? "present" : "none");
      
      const sessionCookie = cookies.split(";").find(c => c.trim().startsWith("twitter_session="));
      
      if (!sessionCookie) {
        console.log("❌ No session cookie found");
        return new Response(JSON.stringify({ authenticated: false }), {
          status: 401,
          headers: { "Content-Type": "application/json" },
        });
      }

      console.log("🍪 Session cookie found, parsing...");
      const sessionData = sessionCookie.split("=")[1];
      const session: TwitterSession = JSON.parse(atob(sessionData));

      console.log("✅ Session parsed:", { username: session.user.username, expiresAt: new Date(session.expiresAt) });

      // Check if session is expired
      if (Date.now() > session.expiresAt) {
        console.log("❌ Session expired");
        return new Response(JSON.stringify({ authenticated: false, expired: true }), {
          status: 401,
          headers: { "Content-Type": "application/json" },
        });
      }

      console.log("✅ User authenticated:", session.user.username);
      return new Response(JSON.stringify({ 
        authenticated: true, 
        user: session.user 
      }), {
        headers: { "Content-Type": "application/json" },
      });
    } catch (error) {
      console.error("❌ Auth check error:", error);
      return new Response(JSON.stringify({ authenticated: false, error: "Invalid session" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }
  },
}; 