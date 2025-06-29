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

// Debug function to test X account ID resolution
async function debugResolveXAccountId(username: string) {
  try {
    console.log("🐛 DEBUG: Resolving X account ID for:", username);
    
    const requestPayload = {
      accountIdsOrUsernames: [username]
    };
    
    const ethosResponse = await fetch('https://api.ethos.network/api/v2/users/by/x', {
      method: 'POST',
      headers: {
        'accept': 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestPayload)
    });
    
    if (!ethosResponse.ok) {
      return {
        success: false,
        error: `Ethos API request failed: ${ethosResponse.status}`,
        username,
        ethosApiStatus: ethosResponse.status
      };
    }

    const ethosData: EthosUserResponse = await ethosResponse.json();
    
    if (!ethosData || ethosData.length === 0) {
      return {
        success: false,
        error: "No Ethos profile found",
        username,
        ethosApiResponse: ethosData
      };
    }

    const userProfile = ethosData[0];
    
    // Look for X.com service key in userkeys
    const xServiceKey = userProfile.userkeys?.find(key => 
      key.startsWith('service:x.com:')
    );
    
    let result;
    if (xServiceKey) {
      const accountId = xServiceKey.replace('service:x.com:', '');
      result = {
        success: true,
        username,
        resolvedXAccountId: accountId,
        attestationTarget: `x.com/${accountId}`,
        usingActualXId: true,
        ethosProfile: {
          id: userProfile.id,
          profileId: userProfile.profileId,
          username: userProfile.username,
          displayName: userProfile.displayName,
          score: userProfile.score
        },
        userkeys: userProfile.userkeys,
        xServiceKey: xServiceKey
      };
    } else {
      result = {
        success: true,
        username,
        resolvedXAccountId: username,
        attestationTarget: `x.com/${username}`,
        usingActualXId: false,
        fallbackReason: "No X.com service key found in userkeys",
        ethosProfile: {
          id: userProfile.id,
          profileId: userProfile.profileId,
          username: userProfile.username,
          displayName: userProfile.displayName,
          score: userProfile.score
        },
        userkeys: userProfile.userkeys
      };
    }
    
    console.log("🐛 DEBUG: Resolution result:", result);
    return result;
    
  } catch (error) {
    return {
      success: false,
      error: `Error resolving X account ID: ${error.message}`,
      username,
      stack: error.stack
    };
  }
}

export const handler: Handlers = {
  async GET(req) {
    console.log("🐛 DEBUG: X account resolution endpoint called");
    
    try {
      // Check authentication first
      const cookies = req.headers.get("cookie") || "";
      const sessionCookie = cookies.split(";").find(c => c.trim().startsWith("twitter_session="));
      
      if (!sessionCookie) {
        return new Response(JSON.stringify({
          error: "Not authenticated - this debug endpoint requires authentication"
        }), {
          status: 401,
          headers: { "Content-Type": "application/json" },
        });
      }

      const sessionData = sessionCookie.split("=")[1];
      const session: SecureSession | null = await verifySecureSession(sessionData);

      if (!session) {
        return new Response(JSON.stringify({
          error: "Invalid or expired session"
        }), {
          status: 401,
          headers: { "Content-Type": "application/json" },
        });
      }

      const url = new URL(req.url);
      const testUsername = url.searchParams.get('username');
      
      if (!testUsername) {
        return new Response(JSON.stringify({
          error: "Missing 'username' query parameter",
          usage: "GET /api/debug/x-account-resolution?username=someUsername",
          authenticatedAs: {
            username: session.user.username,
            xId: session.user.id
          }
        }), {
          status: 400,
          headers: { "Content-Type": "application/json" },
        });
      }

      console.log("🐛 DEBUG: Testing X account resolution for:", testUsername, "requested by:", session.user.username);
      
      const result = await debugResolveXAccountId(testUsername);
      
      return new Response(JSON.stringify({
        requestedBy: {
          username: session.user.username,
          xId: session.user.id
        },
        testUsername,
        result,
        timestamp: new Date().toISOString()
      }, null, 2), {
        headers: { "Content-Type": "application/json" },
      });

    } catch (error) {
      console.error("🐛 DEBUG: X account resolution error:", error);
      
      return new Response(JSON.stringify({
        error: "Debug endpoint error",
        details: error instanceof Error ? error.message : String(error)
      }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });
    }
  },
}; 