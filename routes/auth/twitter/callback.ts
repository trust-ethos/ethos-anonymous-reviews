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
    
    // Get the state from cookie for verification
    const cookies = req.headers.get("cookie") || "";
    const stateCookie = cookies.split(";").find(c => c.trim().startsWith("twitter_oauth_state="));
    const expectedState = stateCookie?.split("=")[1];

    if (!code || !state || state !== expectedState) {
      return new Response("Invalid OAuth callback", { status: 400 });
    }

    try {
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
        throw new Error(`Token exchange failed: ${tokenResponse.status}`);
      }

      const tokenData: TwitterTokenResponse = await tokenResponse.json();

      // Get user information
      const userResponse = await fetch("https://api.twitter.com/2/users/me?user.fields=profile_image_url", {
        headers: {
          "Authorization": `Bearer ${tokenData.access_token}`,
        },
      });

      if (!userResponse.ok) {
        throw new Error(`User fetch failed: ${userResponse.status}`);
      }

      const userData = await userResponse.json();
      const user: TwitterUser = userData.data;

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

      const response = new Response(null, {
        status: 302,
        headers: {
          "Location": "/",
          "Set-Cookie": [
            `twitter_session=${btoa(JSON.stringify(sessionData))}; HttpOnly; Secure; SameSite=Lax; Max-Age=${tokenData.expires_in}`,
            "twitter_oauth_state=; HttpOnly; Secure; SameSite=Lax; Max-Age=0", // Clear state cookie
          ].join(", "),
        },
      });

      return response;
    } catch (error) {
      console.error("Twitter OAuth error:", error);
      return new Response("Authentication failed", { status: 500 });
    }
  },
}; 