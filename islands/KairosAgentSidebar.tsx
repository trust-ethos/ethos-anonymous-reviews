import { useSignal } from "@preact/signals";
import { useEffect } from "preact/hooks";

interface KairosStats {
  displayName: string;
  username: string;
  score: number;
  description?: string;
  reviewCount: number;
  vouchCount: number;
  attestationCount: number;
  vouchAmountEth: string;
  profileUrl: string;
  avatarUrl: string;
}

export default function KairosAgentSidebar() {
  const stats = useSignal<KairosStats | null>(null);
  const loading = useSignal(true);
  const error = useSignal<string | null>(null);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const response = await fetch("/api/kairos-stats");
        if (!response.ok) {
          throw new Error(`Failed to fetch stats: ${response.status}`);
        }
        const data = await response.json();
        stats.value = data;
      } catch (err) {
        error.value = err instanceof Error ? err.message : "Failed to load stats";
        console.error("Error fetching KairosAgent stats:", err);
      } finally {
        loading.value = false;
      }
    };

    fetchStats();
  }, []);

  if (loading.value) {
    return (
      <div class="bg-neutral-900/50 border border-neutral-700 rounded-lg p-6">
        <div class="animate-pulse">
          <div class="h-4 bg-neutral-700 rounded w-32 mb-4"></div>
          <div class="flex items-center gap-3 mb-4">
            <div class="w-12 h-12 bg-neutral-700 rounded-full"></div>
            <div class="flex-1">
              <div class="h-4 bg-neutral-700 rounded w-24 mb-2"></div>
              <div class="h-3 bg-neutral-700 rounded w-16"></div>
            </div>
          </div>
          <div class="space-y-2">
            <div class="h-3 bg-neutral-700 rounded w-full"></div>
            <div class="h-3 bg-neutral-700 rounded w-3/4"></div>
          </div>
        </div>
      </div>
    );
  }

  if (error.value || !stats.value) {
    return (
      <div class="bg-neutral-900/50 border border-neutral-700 rounded-lg p-6">
        <h3 class="text-lg font-semibold text-neutral-300 mb-4">Leave me a review!</h3>
        <p class="text-sm text-neutral-400 mb-4">
          Like this agent? Click here to leave me a review and improve my score on Ethos.
        </p>
        <a 
          href="https://app.ethos.network/profile/x/kairosagent"
          target="_blank"
          rel="noopener noreferrer"
          class="inline-flex items-center justify-center w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-md transition-colors"
        >
          Review KairosAgent on Ethos
        </a>
      </div>
    );
  }

  const getScoreColor = (score: number) => {
    if (score >= 2000) return "text-green-400";
    if (score >= 1600) return "text-blue-400";
    if (score >= 1200) return "text-gray-400";
    if (score >= 800) return "text-yellow-400";
    return "text-red-400";
  };

  const getScoreLabel = (score: number) => {
    if (score >= 2000) return "Exemplary";
    if (score >= 1600) return "Reputable";
    if (score >= 1200) return "Neutral";
    if (score >= 800) return "Questionable";
    return "Untrusted";
  };

  return (
    <div class="bg-neutral-900/50 border border-neutral-700 rounded-lg p-6">
      <h3 class="text-lg font-semibold text-neutral-300 mb-4">Leave me a review!</h3>
      
      {/* Profile Section */}
      <div class="flex items-center gap-3 mb-4">
        <img 
          src={stats.value.avatarUrl}
          alt={`${stats.value.displayName} avatar`}
          class="w-12 h-12 rounded-full object-cover"
        />
        <div class="flex-1">
          <h4 class="font-medium text-neutral-200">{stats.value.displayName}</h4>
          <p class="text-sm text-neutral-400">@{stats.value.username}</p>
        </div>
      </div>

      {/* Description */}
      <p class="text-sm text-neutral-400 mb-4">
        I'm an agent that works for Ethos. I handle all of our anonymous reviews. Please let me know what you think about me by leaving a review for even vouching for me. I'm not into that whole review4review thing, though.
      </p>

      {/* Stats Grid */}
      <div class="grid grid-cols-2 gap-3 mb-4">
        <div class="bg-neutral-800/50 rounded p-3 text-center">
          <div class={`text-lg font-bold ${getScoreColor(stats.value.score)}`}>
            {stats.value.score}
          </div>
          <div class="text-xs text-neutral-400">Ethos Score</div>
          <div class={`text-xs ${getScoreColor(stats.value.score)}`}>
            {getScoreLabel(stats.value.score)}
          </div>
        </div>
        
        <div class="bg-neutral-800/50 rounded p-3 text-center">
          <div class="text-lg font-bold text-neutral-300">{stats.value.reviewCount}</div>
          <div class="text-xs text-neutral-400">Reviews</div>
        </div>
        
        <div class="bg-neutral-800/50 rounded p-3 text-center">
          <div class="text-lg font-bold text-neutral-300">{stats.value.vouchCount}</div>
          <div class="text-xs text-neutral-400">Vouches</div>
        </div>
        
        <div class="bg-neutral-800/50 rounded p-3 text-center">
          <div class="text-lg font-bold text-neutral-300">{stats.value.vouchAmountEth} ETH</div>
          <div class="text-xs text-neutral-400">Vouch Amount</div>
        </div>
      </div>


      
      <a 
        href={stats.value.profileUrl}
        target="_blank"
        rel="noopener noreferrer"
        class="inline-flex items-center justify-center w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-md transition-colors gap-2"
      >
        Review on Ethos
        <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
          <path d="M14,3V5H17.59L7.76,14.83L9.17,16.24L19,6.41V10H21V3M19,19H5V5H12V3H5C3.89,3 3,3.9 3,5V19A2,2 0 0,0 5,21H19A2,2 0 0,0 21,19V12H19V19Z"/>
        </svg>
      </a>
    </div>
  );
} 