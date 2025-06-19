import { Handlers } from "$fresh/server.ts";
import { verifySecureSession, type SecureSession } from "../../../utils/security.ts";

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
  stats: any;
}

type EthosUserResponse = EthosUser[];

export const handler: Handlers = {
  async GET(req) {
    console.log("🐛 DEBUG: Reputation check starting...");
    
    try {
      // Get session cookie
      const cookies = req.headers.get("cookie") || "";
      console.log("🐛 DEBUG: Raw cookies:", cookies);
      
      const sessionCookie = cookies.split(";").find(c => c.trim().startsWith("twitter_session="));
      console.log("🐛 DEBUG: Session cookie found:", !!sessionCookie);
      
      if (!sessionCookie) {
        return new Response(JSON.stringify({ 
          error: "No session cookie found",
          cookies: cookies
        }), {
          status: 401,
          headers: { "Content-Type": "application/json" },
        });
      }

      const sessionData = sessionCookie.split("=")[1];
      console.log("🐛 DEBUG: Session data length:", sessionData.length);
      
      const session: SecureSession | null = await verifySecureSession(sessionData);
      console.log("🐛 DEBUG: Session verification result:", !!session);

      if (!session) {
        return new Response(JSON.stringify({ 
          error: "Invalid or expired session",
          hasSessionData: !!sessionData
        }), {
          status: 401,
          headers: { "Content-Type": "application/json" },
        });
      }

      console.log("🐛 DEBUG: User data from session:", {
        id: session.user.id,
        username: session.user.username,
        name: session.user.name,
        hasProfileImage: !!session.user.profileImageUrl
      });

      // Test the exact API call we're making
      const requestPayload = {
        accountIdsOrUsernames: [session.user.username]
      };
      
      console.log("🐛 DEBUG: API request payload:", requestPayload);

      const ethosResponse = await fetch('https://api.ethos.network/api/v2/users/by/x', {
        method: 'POST',
        headers: {
          'accept': 'application/json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestPayload)
      });
      
      console.log("🐛 DEBUG: Ethos API response status:", ethosResponse.status);
      console.log("🐛 DEBUG: Ethos API response headers:", Object.fromEntries(ethosResponse.headers.entries()));
      
      const responseText = await ethosResponse.text();
      console.log("🐛 DEBUG: Raw API response:", responseText);
      
      let ethosData: EthosUserResponse;
      try {
        ethosData = JSON.parse(responseText);
      } catch (parseError) {
        console.log("🐛 DEBUG: JSON parse error:", parseError);
        return new Response(JSON.stringify({
          error: "Failed to parse Ethos API response",
          status: ethosResponse.status,
          responseText: responseText,
          username: session.user.username
        }), {
          headers: { "Content-Type": "application/json" },
        });
      }
      
      if (!ethosData || ethosData.length === 0) {
        console.log("🐛 DEBUG: No Ethos profile data found");
        return new Response(JSON.stringify({
          error: "No Ethos profile found",
          username: session.user.username,
          apiResponse: ethosData,
          searchedFor: requestPayload.accountIdsOrUsernames
        }), {
          headers: { "Content-Type": "application/json" },
        });
      }

      const userProfile = ethosData[0];
      const score = userProfile.score;
      const canSubmit = score >= 1600;
      
      console.log("🐛 DEBUG: Final evaluation:", {
        username: session.user.username,
        foundProfile: userProfile.username,
        score: score,
        threshold: 1600,
        canSubmit: canSubmit,
        scoreCheck: `${score} >= 1600 = ${score >= 1600}`
      });

      return new Response(JSON.stringify({
        debug: true,
        sessionUser: {
          id: session.user.id,
          username: session.user.username,
          name: session.user.name
        },
        ethosProfile: {
          id: userProfile.id,
          username: userProfile.username,
          displayName: userProfile.displayName,
          score: userProfile.score,
          status: userProfile.status
        },
        evaluation: {
          score: score,
          threshold: 1600,
          canSubmit: canSubmit,
          scoreCheck: `${score} >= 1600 = ${score >= 1600}`,
          reason: canSubmit ? "Qualified" : `Score ${score} is below threshold 1600`
        },
        apiRequest: requestPayload,
        apiResponseLength: ethosData.length
      }), {
        headers: { "Content-Type": "application/json" },
      });

    } catch (error) {
      console.error("🐛 DEBUG: Error in reputation check:", error);
      return new Response(JSON.stringify({ 
        error: "Debug reputation check failed",
        errorMessage: error instanceof Error ? error.message : "Unknown error",
        errorStack: error instanceof Error ? error.stack : undefined
      }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });
    }
  },
}; 