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
    
    // First try: Look for X.com service key in userkeys
    const xServiceKey = userProfile.userkeys?.find(key => 
      key.startsWith('service:x.com:')
    );
    
    let result: any = {
      username,
      ethosProfile: {
        id: userProfile.id,
        profileId: userProfile.profileId,
        username: userProfile.username,
        displayName: userProfile.displayName,
        score: userProfile.score
      },
      userkeys: userProfile.userkeys,
      methods: {
        userkeysMethod: null,
        twitterApiMethod: null
      }
    };
    
    if (xServiceKey) {
      const accountId = xServiceKey.replace('service:x.com:', '');
      result.methods.userkeysMethod = {
        success: true,
        xAccountId: accountId,
        xServiceKey: xServiceKey
      };
      result.success = true;
      result.resolvedXAccountId = accountId;
      result.attestationTarget = `x.com/${accountId}`;
      result.primaryMethod = "userkeys";
      result.usingActualXId = true;
      
      console.log("🐛 DEBUG: Userkeys method succeeded:", accountId);
      return result;
    } else {
      result.methods.userkeysMethod = {
        success: false,
        reason: "No X.com service key found in userkeys"
      };
    }
    
    // Second try: Use Ethos Twitter user API
    try {
      const twitterUserResponse = await fetch(`https://api.ethos.network/api/twitter/user?username=${username}`, {
        method: 'GET',
        headers: {
          'accept': 'application/json',
        }
      });
      
      if (twitterUserResponse.ok) {
        const twitterUserData = await twitterUserResponse.json();
        
        if (twitterUserData.ok && twitterUserData.data && twitterUserData.data.id) {
          const xAccountId = twitterUserData.data.id;
          result.methods.twitterApiMethod = {
            success: true,
            xAccountId: xAccountId,
            twitterUserData: twitterUserData.data
          };
          result.success = true;
          result.resolvedXAccountId = xAccountId;
          result.attestationTarget = `x.com/${xAccountId}`;
          result.primaryMethod = "twitterApi";
          result.usingActualXId = true;
          
          console.log("🐛 DEBUG: Twitter API method succeeded:", xAccountId);
          return result;
        } else {
          result.methods.twitterApiMethod = {
            success: false,
            reason: "Twitter API returned invalid data",
            response: twitterUserData
          };
        }
      } else {
        result.methods.twitterApiMethod = {
          success: false,
          reason: `Twitter API request failed: ${twitterUserResponse.status}`,
          status: twitterUserResponse.status
        };
      }
    } catch (twitterApiError) {
      result.methods.twitterApiMethod = {
        success: false,
        reason: "Twitter API error",
        error: twitterApiError instanceof Error ? twitterApiError.message : String(twitterApiError)
      };
    }
    
    // Both methods failed
    result.success = false;
    result.error = "Both userkeys and Twitter API methods failed - refusing to fall back to username for data integrity";
    result.resolvedXAccountId = null;
    result.attestationTarget = null;
    result.recommendation = "User must have their X.com account properly linked in their Ethos profile, or the Twitter API must be accessible";
    
    console.log("🐛 DEBUG: Both methods failed for:", username);
    return result;
    
  } catch (error) {
    return {
      success: false,
      error: `Error resolving X account ID: ${error instanceof Error ? error.message : String(error)}`,
      username,
      stack: error instanceof Error ? error.stack : undefined
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