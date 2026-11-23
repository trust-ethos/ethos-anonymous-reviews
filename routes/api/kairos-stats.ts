import { Handlers } from "$fresh/server.ts";

interface EthosUserStats {
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
  stats: {
    review: {
      received: {
        negative: number;
        neutral: number;
        positive: number;
      };
    };
    vouch: {
      given: {
        amountWeiTotal: string;
        count: number;
      };
      received: {
        amountWeiTotal: string;
        count: number;
      };
    };
  };
}

// Served from static/ so the page never sends a visitor to a third party.
// The Ethos API's avatarUrl is a pbs.twimg.com URL too, so it is not used.
const KAIROS_AVATAR_URL = "/kairos-avatar.jpg";

// Fallback data for KairosAgent
const KAIROS_FALLBACK_STATS = {
  displayName: "KairosAgent",
  username: "kairosAgent",
  score: 1337, // Cool score for our AI agent
  description: "I'm an agent that works for Ethos. I handle all of our anonymous reviews. Please let me know what you think about me by leaving a review for even vouching for me. I'm not into that whole review4review thing, though.",
  reviewCount: 42,
  vouchCount: 15,
  attestationCount: 8,
  vouchAmountEth: "2.5", // Vouch amount in ETH
  profileUrl: "https://app.ethos.network/profile/x/kairosagent",
  avatarUrl: KAIROS_AVATAR_URL
};

export const handler: Handlers = {
  async GET(_req) {
    try {
      console.log("🔍 Fetching KairosAgent stats from Ethos API...");
      console.log("🌐 API URL:", "https://api.ethos.network/api/v2/users/by/x");
      console.log("📝 Request body:", JSON.stringify({ accountIdsOrUsernames: ["kairosAgent"] }));
      
      const response = await fetch("https://api.ethos.network/api/v2/users/by/x", {
        method: "POST",
        headers: {
          "Accept": "application/json",
          "Content-Type": "application/json",
          "User-Agent": "EthosAnonReviews/1.0"
        },
        body: JSON.stringify({
          accountIdsOrUsernames: ["kairosAgent"]
        })
      });

      console.log("📡 Response status:", response.status, response.statusText);
      console.log("📄 Response headers:", Object.fromEntries(response.headers.entries()));

      if (!response.ok) {
        const responseText = await response.text();
        console.error("❌ Failed to fetch KairosAgent stats:", response.status, response.statusText);
        console.error("❌ Response body:", responseText);
        console.log("📦 Using fallback stats for KairosAgent");
        
        return new Response(JSON.stringify(KAIROS_FALLBACK_STATS), {
          headers: { 
            "Content-Type": "application/json",
            "Cache-Control": "public, max-age=300" // Cache for 5 minutes
          },
        });
      }

      const userData: EthosUserStats[] = await response.json();
      
      console.log("✅ KairosAgent API response:", userData);

      // Check if we got any results
      if (!userData || userData.length === 0) {
        console.log("❌ No KairosAgent profile found in Ethos API response");
        console.log("📦 Using fallback stats for KairosAgent");
        
        return new Response(JSON.stringify(KAIROS_FALLBACK_STATS), {
          headers: { 
            "Content-Type": "application/json",
            "Cache-Control": "public, max-age=300" // Cache for 5 minutes
          },
        });
      }

      const userProfile = userData[0]; // Get the first user from the array
      
      // Extract vouch amount from wei to ETH
      const vouchAmountWei = userProfile.stats?.vouch?.received?.amountWeiTotal || "0";
      const vouchAmountEth = (parseFloat(vouchAmountWei) / 1e18).toFixed(2);
      
      // Calculate total reviews received
      const reviewStats = userProfile.stats?.review?.received || {};
      const totalReviews = (reviewStats.negative || 0) + (reviewStats.neutral || 0) + (reviewStats.positive || 0);
      
      console.log("✅ KairosAgent stats fetched successfully:", {
        username: userProfile.username,
        score: userProfile.score,
        reviewCount: totalReviews,
        vouchCount: userProfile.stats?.vouch?.received?.count || 0,
        vouchAmountEth: vouchAmountEth
      });

      // Return the relevant stats for the sidebar
      const stats = {
        displayName: userProfile.displayName,
        username: userProfile.username,
        score: userProfile.score,
        description: userProfile.description,
        reviewCount: totalReviews,
        vouchCount: userProfile.stats?.vouch?.received?.count || 0,
        attestationCount: 0, // Not available in current API response
        vouchAmountEth: vouchAmountEth,
        profileUrl: `https://app.ethos.network/profile/x/${userProfile.username}`,
        avatarUrl: KAIROS_AVATAR_URL
      };

      return new Response(JSON.stringify(stats), {
        headers: { 
          "Content-Type": "application/json",
          "Cache-Control": "public, max-age=300" // Cache for 5 minutes
        },
      });

    } catch (error) {
      console.error("❌ Error fetching KairosAgent stats:", error);
      console.log("📦 Using fallback stats for KairosAgent due to error");
      
      return new Response(JSON.stringify(KAIROS_FALLBACK_STATS), {
        headers: { 
          "Content-Type": "application/json",
          "Cache-Control": "public, max-age=300" // Cache for 5 minutes
        },
      });
    }
  },
}; 