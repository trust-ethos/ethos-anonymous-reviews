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

  // The card is an e-card, like the review form above it. What sits inside it steps to another
  // surface instead of drawing a border: placeholders step up, stat tiles step down to the base.
  const placeholder = "background: var(--ethos-bg-elevated); border-radius: var(--ethos-radius-sm)";
  const tileSurface = "background: var(--ethos-bg-base)";
  // The full-width links below take w-full, not e-btn's "block": Tailwind has a utility of the same
  // name that sets display: block, which un-centres the label of a link.

  if (loading.value) {
    return (
      <div class="e-card sm:p-6">
        <div class="animate-pulse">
          <div class="h-4 w-32 mb-4" style={placeholder}></div>
          <div class="flex items-center gap-3 mb-4">
            <div class="e-avatar lg">
              <div class="ph"></div>
            </div>
            <div class="flex-1">
              <div class="h-4 w-24 mb-2" style={placeholder}></div>
              <div class="h-3 w-16" style={placeholder}></div>
            </div>
          </div>
          <div class="space-y-2">
            <div class="h-3 w-full" style={placeholder}></div>
            <div class="h-3 w-3/4" style={placeholder}></div>
          </div>
        </div>
      </div>
    );
  }

  if (error.value || !stats.value) {
    return (
      <div class="e-card sm:p-6">
        <h3 class="e-text h4 mb-2">Leave me a review!</h3>
        <p class="e-text md body mb-4">
          Like this agent? Click here to leave me a review and improve my score on Ethos.
        </p>
        <a 
          href="https://app.ethos.network/profile/x/kairosAgent?modal=review&source=anon-ethos-network"
          target="_blank"
          rel="noopener noreferrer"
          class="e-btn primary lg w-full"
        >
          Review KairosAgent on Ethos
        </a>
      </div>
    );
  }

  // The level colour for a score, as a design system token (used as an inline `color`).
  const getScoreColor = (score: number) => {
    if (score >= 2000) return "var(--ethos-level-exemplary)";
    if (score >= 1600) return "var(--ethos-level-reputable)";
    if (score >= 1200) return "var(--ethos-level-neutral)";
    if (score >= 800) return "var(--ethos-level-questionable)";
    return "var(--ethos-level-untrusted)";
  };

  const getScoreLabel = (score: number) => {
    if (score >= 2000) return "Exemplary";
    if (score >= 1600) return "Reputable";
    if (score >= 1200) return "Neutral";
    if (score >= 800) return "Questionable";
    return "Untrusted";
  };

  return (
    <div class="e-card sm:p-6">
      <h3 class="e-text h4 mb-4">Leave me a review!</h3>
      
      {/* Profile Section */}
      <div class="flex items-center gap-3 mb-4">
        <div class="e-avatar lg">
          <img 
            src={stats.value.avatarUrl}
            alt={`${stats.value.displayName} avatar`}
          />
        </div>
        <div class="flex-1 min-w-0">
          <h4 class="e-text lg sans">{stats.value.displayName}</h4>
          <p class="e-text md muted">@{stats.value.username}</p>
        </div>
      </div>

      {/* Description */}
      <p class="e-text md body mb-4">
        I'm an agent that works for Ethos. I handle all of our anonymous reviews. Please let me know what you think about me by leaving a review for even vouching for me. I'm not into that whole review4review thing, though.
      </p>

      {/* Stats Grid */}
      <div class="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-4">
        <div class="e-stat" style={tileSurface}>
          <span class="label">Ethos Score</span>
          <span class="value" style={{ color: getScoreColor(stats.value.score) }}>
            {stats.value.score}
          </span>
          <span class="sub" style={{ color: getScoreColor(stats.value.score) }}>
            {getScoreLabel(stats.value.score)}
          </span>
        </div>
        
        <div class="e-stat" style={tileSurface}>
          <span class="label">Reviews</span>
          <span class="value">{stats.value.reviewCount}</span>
        </div>
        
        <div class="e-stat" style={tileSurface}>
          <span class="label">Vouches</span>
          <span class="value">{stats.value.vouchCount}</span>
        </div>
        
        <div class="e-stat" style={tileSurface}>
          <span class="label">Vouch Amount</span>
          <span class="value">{stats.value.vouchAmountEth} <span class="e-text mono sm muted">ETH</span></span>
        </div>
      </div>


      
      <a 
        href={`${stats.value.profileUrl}?modal=review&source=anon-ethos-network`}
        target="_blank"
        rel="noopener noreferrer"
        class="e-btn primary lg w-full"
      >
        Review KairosAgent on Ethos
        <span class="ei ei-open-in-new" aria-hidden="true"></span>
      </a>
    </div>
  );
} 