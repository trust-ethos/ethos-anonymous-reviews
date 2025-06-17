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

export const handler: Handlers = {
  async GET(_req) {
    try {
      console.log("🔍 Fetching KairosAgent stats from Ethos API...");
      
      const response = await fetch("https://app.ethos.network/api/v2/users/by/x/kairosagent", {
        headers: {
          "Accept": "application/json",
          "User-Agent": "EthosAnonReviews/1.0"
        }
      });

      if (!response.ok) {
        console.error("❌ Failed to fetch KairosAgent stats:", response.status, response.statusText);
        return new Response(JSON.stringify({ 
          error: "Failed to fetch profile stats",
          status: response.status
        }), {
          status: response.status,
          headers: { "Content-Type": "application/json" },
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
        xpTotal: userData.xpTotal || 0,
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
      
      return new Response(JSON.stringify({ 
        error: "Internal server error",
        message: error instanceof Error ? error.message : String(error)
      }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });
    }
  },
}; 