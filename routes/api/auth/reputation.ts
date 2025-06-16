import { Handlers } from "$fresh/server.ts";

interface TwitterSession {
  user: {
    id: string;
    name: string;
    username: string;
    profileImageUrl?: string;
  };
  accessToken: string;
  expiresAt: number;
}

interface EthosUserResponse {
  data: {
    id: number;
    profileId: number;
    displayName: string;
    username: string;
    avatarUrl?: string;
    score: number;
    description?: string;
  }[];
}

export const handler: Handlers = {
  async GET(req) {
    console.log("🔍 Checking user reputation...");
    
    try {
      // Get session cookie
      const cookies = req.headers.get("cookie") || "";
      const sessionCookie = cookies.split(";").find(c => c.trim().startsWith("twitter_session="));
      
      if (!sessionCookie) {
        console.log("❌ No session cookie found");
        return new Response(JSON.stringify({ authenticated: false }), {
          status: 401,
          headers: { "Content-Type": "application/json" },
        });
      }

      const sessionData = sessionCookie.split("=")[1];
      const session: TwitterSession = JSON.parse(atob(sessionData));

      // Check if session is expired
      if (Date.now() > session.expiresAt) {
        console.log("❌ Session expired");
        return new Response(JSON.stringify({ authenticated: false, expired: true }), {
          status: 401,
          headers: { "Content-Type": "application/json" },
        });
      }

      console.log("✅ User authenticated, checking Ethos reputation for:", session.user.username);

      // Check Ethos API for user reputation
      const ethosResponse = await fetch('https://api.ethos.network/api/v2/users/by/x', {
        method: 'POST',
        headers: {
          'accept': 'application/json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          accountIdsOrUsernames: [session.user.username]
        })
      });
      
      if (!ethosResponse.ok) {
        console.log("❌ Ethos API request failed:", ethosResponse.status);
        return new Response(JSON.stringify({ 
          authenticated: true, 
          user: session.user,
          ethosProfile: null,
          reputation: null,
          canSubmit: false,
          reason: "Failed to check Ethos network"
        }), {
          headers: { "Content-Type": "application/json" },
        });
      }

      const ethosData: EthosUserResponse = await ethosResponse.json();
      
      if (!ethosData.data || ethosData.data.length === 0) {
        console.log("❌ No Ethos profile data found");
        return new Response(JSON.stringify({ 
          authenticated: true, 
          user: session.user,
          ethosProfile: null,
          reputation: null,
          canSubmit: false,
          reason: "No Ethos profile found"
        }), {
          headers: { "Content-Type": "application/json" },
        });
      }

      const userProfile = ethosData.data[0]; // Get the first (and should be only) user
      const score = userProfile.score;
      const canSubmit = score >= 1600;
      
      let reputationLevel = "unknown";
      if (score >= 2000) {
        reputationLevel = "exemplary";
      } else if (score >= 1600) {
        reputationLevel = "reputable";
      }

      console.log("✅ Ethos reputation found:", { username: session.user.username, score, reputationLevel, canSubmit });

      return new Response(JSON.stringify({ 
        authenticated: true, 
        user: session.user,
        ethosProfile: userProfile,
        reputation: {
          score,
          level: reputationLevel,
          canSubmit,
          reason: canSubmit ? null : "Must be reputable to submit (score ≥ 1600)"
        }
      }), {
        headers: { "Content-Type": "application/json" },
      });
    } catch (error) {
      console.error("❌ Reputation check error:", error);
      return new Response(JSON.stringify({ 
        authenticated: false, 
        error: "Failed to check reputation" 
      }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });
    }
  },
}; 