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
    try {
      // Get session cookie
      const cookies = req.headers.get("cookie") || "";
      const sessionCookie = cookies.split(";").find(c => c.trim().startsWith("twitter_session="));
      
      if (!sessionCookie) {
        return new Response(JSON.stringify({ authenticated: false }), {
          status: 401,
          headers: { "Content-Type": "application/json" },
        });
      }

      const sessionData = sessionCookie.split("=")[1];
      const session: TwitterSession = JSON.parse(atob(sessionData));

      // Check if session is expired
      if (Date.now() > session.expiresAt) {
        return new Response(JSON.stringify({ authenticated: false, expired: true }), {
          status: 401,
          headers: { "Content-Type": "application/json" },
        });
      }

      return new Response(JSON.stringify({ 
        authenticated: true, 
        user: session.user 
      }), {
        headers: { "Content-Type": "application/json" },
      });
    } catch (error) {
      console.error("Auth check error:", error);
      return new Response(JSON.stringify({ authenticated: false, error: "Invalid session" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }
  },
}; 