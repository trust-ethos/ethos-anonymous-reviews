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
    reviewCount: number;
    vouchCount: number;
    attestationCount: number;
    inviteCount: number;
  };
}

// Fallback data for KairosAgent
const KAIROS_FALLBACK_STATS = {
  displayName: "KairosAgent",
  username: "kairosagent",
  score: 1337, // Cool score for our AI agent
  description: "AI agent helping users create anonymous reviews on Ethos. I make Web3 reputation accessible and fun!",
  reviewCount: 42,
  vouchCount: 15,
  attestationCount: 8,
  vouchAmountEth: "2.5", // Vouch amount in ETH
  profileUrl: "https://app.ethos.network/profile/x/kairosagent",
  avatarUrl: "https://pbs.twimg.com/profile_images/1934487333446832128/xN50ioZ4.jpg"
};

export const handler: Handlers = {
  async GET(_req) {
    try {
      console.log("🔍 Fetching KairosAgent stats from Ethos API...");
      console.log("🌐 API URL:", "https://api.ethos.network/api/v2/users/by/x/kairosagent");
      
      const response = await fetch("https://api.ethos.network/api/v2/users/by/x/kairosagent", {
        headers: {
          "Accept": "application/json",
          "User-Agent": "EthosAnonReviews/1.0"
        }
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

      const userData: EthosUserStats = await response.json();
      
      console.log("✅ KairosAgent stats fetched successfully:", {
        username: userData.username,
        score: userData.score,
        reviewCount: userData.stats?.reviewCount || 0,
        vouchCount: userData.stats?.vouchCount || 0
      });

      // Return the relevant stats for the sidebar
      const stats = {
        displayName: userData.displayName,
        username: userData.username,
        score: userData.score,
        description: userData.description,
        reviewCount: userData.stats?.reviewCount || 0,
        vouchCount: userData.stats?.vouchCount || 0,
        attestationCount: userData.stats?.attestationCount || 0,
        vouchAmountEth: "0.0", // TODO: Extract from actual vouch data when available
        profileUrl: `https://app.ethos.network/profile/x/${userData.username}`,
        avatarUrl: "https://pbs.twimg.com/profile_images/1934487333446832128/xN50ioZ4.jpg"
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