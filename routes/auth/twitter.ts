import { Handlers } from "$fresh/server.ts";

// Twitter OAuth 2.0 configuration
const TWITTER_CLIENT_ID = Deno.env.get("TWITTER_CLIENT_ID") || "";
const TWITTER_CLIENT_SECRET = Deno.env.get("TWITTER_CLIENT_SECRET") || "";
const REDIRECT_URI = Deno.env.get("TWITTER_REDIRECT_URI") || "http://localhost:8000/auth/twitter/callback";

export const handler: Handlers = {
  GET(req) {
    const url = new URL(req.url);
    
    console.log("🔄 Starting Twitter OAuth flow...");
    
    // Generate a random state parameter for security
    const state = crypto.randomUUID();
    
    // Determine if we're in production (HTTPS) or development (HTTP)
    console.log("🔍 URL details:", { hostname: url.hostname, protocol: url.protocol, href: url.href });
    // Force development mode for now to fix cookie issues
    const isProduction = false;
    const cookieFlags = isProduction ? "HttpOnly; Secure; SameSite=Lax" : "HttpOnly; SameSite=Lax";
    
    console.log("🍪 Setting state cookie...", { state, isProduction, cookieFlags });
    
    // Store state in a cookie for verification later
    const response = new Response(null, {
      status: 302,
      headers: {
        "Set-Cookie": `twitter_oauth_state=${state}; ${cookieFlags}; Max-Age=600`,
      },
    });

    // Twitter OAuth 2.0 authorization URL
    const authUrl = new URL("https://twitter.com/i/oauth2/authorize");
    authUrl.searchParams.set("response_type", "code");
    authUrl.searchParams.set("client_id", TWITTER_CLIENT_ID);
    authUrl.searchParams.set("redirect_uri", REDIRECT_URI);
    authUrl.searchParams.set("scope", "tweet.read users.read");
    authUrl.searchParams.set("state", state);
    authUrl.searchParams.set("code_challenge", "challenge");
    authUrl.searchParams.set("code_challenge_method", "plain");

    console.log("🔗 Redirecting to Twitter:", authUrl.toString());
    
    response.headers.set("Location", authUrl.toString());
    return response;
  },
}; 