import { Handlers } from "$fresh/server.ts";

// Twitter OAuth 2.0 configuration
const TWITTER_CLIENT_ID = Deno.env.get("TWITTER_CLIENT_ID") || "";
const TWITTER_CLIENT_SECRET = Deno.env.get("TWITTER_CLIENT_SECRET") || "";
const REDIRECT_URI = Deno.env.get("TWITTER_REDIRECT_URI") || "http://localhost:8000/auth/twitter/callback";

interface TwitterTokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
  refresh_token?: string;
  scope: string;
}

interface TwitterUser {
  id: string;
  name: string;
  username: string;
  profile_image_url?: string;
}

export const handler: Handlers = {
  async GET(req) {
    const url = new URL(req.url);
    const code = url.searchParams.get("code");
    const state = url.searchParams.get("state");
    
    console.log("🔄 Twitter callback received:", { code: !!code, state: !!state });
    
    // Get the state from cookie for verification
    const cookies = req.headers.get("cookie") || "";
    const stateCookie = cookies.split(";").find(c => c.trim().startsWith("twitter_oauth_state="));
    const expectedState = stateCookie?.split("=")[1];

    console.log("🍪 State verification:", { received: state, expected: expectedState });

    if (!code || !state || state !== expectedState) {
      console.error("❌ Invalid OAuth callback:", { code: !!code, state, expectedState });
      return new Response("Invalid OAuth callback", { status: 400 });
    }

    try {
      console.log("🔄 Exchanging code for token...");
      
      // Exchange code for access token
      const tokenResponse = await fetch("https://api.twitter.com/2/oauth2/token", {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          "Authorization": `Basic ${btoa(`${TWITTER_CLIENT_ID}:${TWITTER_CLIENT_SECRET}`)}`,
        },
        body: new URLSearchParams({
          grant_type: "authorization_code",
          code,
          redirect_uri: REDIRECT_URI,
          code_verifier: "challenge",
        }),
      });

      if (!tokenResponse.ok) {
        const errorText = await tokenResponse.text();
        console.error("❌ Token exchange failed:", tokenResponse.status, errorText);
        throw new Error(`Token exchange failed: ${tokenResponse.status}`);
      }

      const tokenData: TwitterTokenResponse = await tokenResponse.json();
      console.log("✅ Token received, fetching user data...");

      // Get user information
      const userResponse = await fetch("https://api.twitter.com/2/users/me?user.fields=profile_image_url", {
        headers: {
          "Authorization": `Bearer ${tokenData.access_token}`,
        },
      });

      if (!userResponse.ok) {
        const errorText = await userResponse.text();
        console.error("❌ User fetch failed:", userResponse.status, errorText);
        throw new Error(`User fetch failed: ${userResponse.status}`);
      }

      const userData = await userResponse.json();
      const user: TwitterUser = userData.data;
      
      console.log("✅ User data received:", { username: user.username, name: user.name });

      // Create session cookie with user data
      const sessionData = {
        user: {
          id: user.id,
          name: user.name,
          username: user.username,
          profileImageUrl: user.profile_image_url,
        },
        accessToken: tokenData.access_token,
        expiresAt: Date.now() + (tokenData.expires_in * 1000),
      };

      // Determine if we're in production (HTTPS) or development (HTTP)
      console.log("🔍 URL details:", { hostname: url.hostname, protocol: url.protocol, href: url.href });
      // Force development mode for now to fix cookie issues
      const isProduction = false;
      const cookieFlags = isProduction ? "HttpOnly; Secure; SameSite=Lax" : "HttpOnly; SameSite=Lax";

      console.log("🍪 Setting session cookie...", { isProduction, cookieFlags });

      const response = new Response(null, {
        status: 302,
        headers: {
          "Location": "/",
          "Set-Cookie": [
            `twitter_session=${btoa(JSON.stringify(sessionData))}; ${cookieFlags}; Max-Age=${tokenData.expires_in}`,
            `twitter_oauth_state=; ${cookieFlags}; Max-Age=0`, // Clear state cookie
          ].join(", "),
        },
      });

      console.log("✅ Authentication successful, redirecting to home");
      return response;
    } catch (error) {
      console.error("❌ Twitter OAuth error:", error);
      return new Response("Authentication failed", { status: 500 });
    }
  },
}; 