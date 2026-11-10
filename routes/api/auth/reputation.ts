import { Handlers } from "$fresh/server.ts";
import { verifySecureSession, type SecureSession } from "../../../utils/security.ts";
import { levelForScore, MIN_SCORE } from "../../../utils/reputation.ts";

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

interface EthosUser {
  id: number;
  profileId: number;
  displayName: string;
  username: string;
  avatarUrl?: string;
  score: number;
  description?: string;
  status: string;
  userkeys: string[];
  xpTotal: number;
  xpStreakDays: number;
  stats: unknown;
}

type EthosUserResponse = EthosUser[];

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
          headers: { 
            "Content-Type": "application/json",
            "Cache-Control": "no-cache, no-store, must-revalidate"
          },
        });
      }

      const sessionData = sessionCookie.split("=")[1];
      const session: SecureSession | null = await verifySecureSession(sessionData);

      if (!session) {
        console.log("❌ Invalid or expired session");
        return new Response(JSON.stringify({ authenticated: false, expired: true }), {
          status: 401,
          headers: { 
            "Content-Type": "application/json",
            "Cache-Control": "no-cache, no-store, must-revalidate"
          },
        });
      }

      console.log("✅ User authenticated, checking Ethos reputation...");

      // Prepare request payload
      const requestPayload = {
        accountIdsOrUsernames: [session.user.username]
      };
      
      console.log("📤 Sending Ethos API request:", {
        url: 'https://api.ethos.network/api/v2/users/by/x',
        method: 'POST',
      });

      // Check Ethos API for user reputation
      const ethosResponse = await fetch('https://api.ethos.network/api/v2/users/by/x', {
        method: 'POST',
        headers: {
          'accept': 'application/json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestPayload)
      });
      
      console.log("📥 Ethos API response status:", ethosResponse.status);
      
      if (!ethosResponse.ok) {
        const errorText = await ethosResponse.text();
        console.log("❌ Ethos API request failed:", ethosResponse.status, errorText);
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
      console.log("📥 Ethos API response data:", { found: Array.isArray(ethosData) && ethosData.length > 0 });
      
      if (!ethosData || ethosData.length === 0) {
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

      const userProfile = ethosData[0]; // Get the first (and should be only) user
      const score = userProfile.score;
      const canSubmit = score >= MIN_SCORE;
      const reputationLevel = levelForScore(score) ?? "unknown";

      console.log("✅ Ethos reputation found:", { found: true, canSubmit });

      return new Response(JSON.stringify({ 
        authenticated: true, 
        user: session.user,
        ethosProfile: userProfile,
        reputation: {
          score,
          level: reputationLevel,
          canSubmit,
          reason: canSubmit ? null : `Must be reputable to submit (score ≥ ${MIN_SCORE}). Your current score: ${score}`
        }
      }), {
        headers: { 
          "Content-Type": "application/json",
          "Cache-Control": "no-cache, no-store, must-revalidate",
          "Pragma": "no-cache",
          "Expires": "0"
        },
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