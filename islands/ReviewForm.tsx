import { useSignal } from "@preact/signals";
import { useEffect } from "preact/hooks";
import EthosProfileSearch from "./EthosProfileSearch.tsx";

interface EthosProfile {
  id: number;
  profileId: number;
  displayName: string;
  username: string;
  avatarUrl?: string;
  score: number;
  description?: string;
}

interface TwitterUser {
  id: string;
  name: string;
  username: string;
  profileImageUrl?: string;
}

interface ReputationData {
  authenticated: boolean;
  user?: TwitterUser;
  ethosProfile?: EthosProfile | null;
  reputation?: {
    score: number;
    level: string;
    canSubmit: boolean;
    reason?: string | null;
  } | null;
  reason?: string;
}

export default function ReviewForm() {
  const selectedProfile = useSignal<EthosProfile | null>(null);
  const reviewTitle = useSignal("");
  const reviewDescription = useSignal("");
  const sentiment = useSignal<"negative" | "neutral" | "positive" | "">("");
  const isSubmitting = useSignal(false);
  const reputationData = useSignal<ReputationData | null>(null);
  const isLoadingReputation = useSignal(true);

  useEffect(() => {
    // Check user reputation on component mount
    const checkReputation = async () => {
      try {
        const response = await fetch('/api/auth/reputation');
        if (response.ok) {
          const data = await response.json();
          reputationData.value = data;
        } else {
          reputationData.value = { authenticated: false };
        }
      } catch (error) {
        console.log('Failed to check reputation:', error);
        reputationData.value = { authenticated: false };
      } finally {
        isLoadingReputation.value = false;
      }
    };

    checkReputation();
  }, []);

  const handleSubmit = async (e: Event) => {
    e.preventDefault();
    
    if (!selectedProfile.value || !reviewTitle.value.trim() || !reviewDescription.value.trim() || !sentiment.value) {
      alert("Please fill in all fields");
      return;
    }

    isSubmitting.value = true;
    
    try {
      // TODO: Submit review to backend
      console.log("Submitting review:", {
        profile: selectedProfile.value,
        title: reviewTitle.value,
        description: reviewDescription.value,
        sentiment: sentiment.value,
      });
      
      // Reset form
      selectedProfile.value = null;
      reviewTitle.value = "";
      reviewDescription.value = "";
      sentiment.value = "";
      
      alert("Review submitted successfully!");
    } catch (error) {
      console.error("Error submitting review:", error);
      alert("Failed to submit review. Please try again.");
    } finally {
      isSubmitting.value = false;
    }
  };

  const titleCharCount = reviewTitle.value.length;
  const maxTitleLength = 120;

  const canSubmit = reputationData.value?.reputation?.canSubmit ?? false;
  const submitDisabledReason = reputationData.value?.reputation?.reason || reputationData.value?.reason;

  return (
    <form onSubmit={handleSubmit} class="space-y-6">
      {/* You Section - Show when authenticated */}
      {reputationData.value?.authenticated && (
        <div>
          <label class="block text-sm font-medium mb-2">
            You
          </label>
          <div class="flex items-center gap-3 p-3 bg-neutral-800 border border-neutral-700 rounded-md">
            <div class="w-10 h-10 rounded-full bg-neutral-600 flex items-center justify-center text-neutral-300">
              <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 2C13.1 2 14 2.9 14 4C14 5.1 13.1 6 12 6C10.9 6 10 5.1 10 4C10 2.9 10.9 2 12 2ZM21 9V7L15 1H5C3.89 1 3 1.89 3 3V21C3 22.11 3.89 23 5 23H19C20.11 23 21 22.11 21 21V9M19 9H14V4H5V21H19V9Z"/>
              </svg>
            </div>
            <div class="flex-1">
              <div class="text-sm font-medium">
                Anonymous {reputationData.value.reputation?.level || "user"}
              </div>
              <div class="text-xs text-neutral-400">
                {reputationData.value.reputation ? 
                  `Score: ${reputationData.value.reputation.score}` : 
                  "Reputation unknown"
                }
              </div>
            </div>
            {reputationData.value.reputation?.level && (
              <div class={`px-2 py-1 rounded text-xs font-medium ${
                reputationData.value.reputation.level === 'exemplary' 
                  ? 'bg-green-900 text-green-300' 
                  : reputationData.value.reputation.level === 'reputable'
                  ? 'bg-blue-900 text-blue-300'
                  : 'bg-neutral-700 text-neutral-300'
              }`}>
                {reputationData.value.reputation.level}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Profile Search */}
      <div>
        <label class="block text-sm font-medium mb-2">
          Select Ethos Profile
        </label>
        <EthosProfileSearch 
          selectedProfile={selectedProfile}
          onProfileSelect={(profile) => selectedProfile.value = profile}
        />
      </div>

      {/* Sentiment */}
      <div>
        <label class="block text-sm font-medium mb-2">
          Review Type
        </label>
        <div class="flex gap-2">
          {[
            { value: "negative", label: "Negative", color: "text-red-400 border-red-400" },
            { value: "neutral", label: "Neutral", color: "text-yellow-400 border-yellow-400" },
            { value: "positive", label: "Positive", color: "text-green-400 border-green-400" },
          ].map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => sentiment.value = option.value as any}
              class={`px-4 py-2 border rounded-md text-sm font-medium transition-colors ${
                sentiment.value === option.value
                  ? `${option.color} bg-opacity-10`
                  : "border-neutral-700 text-neutral-400 hover:border-neutral-600"
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      {/* Review Title */}
      <div>
        <label class="block text-sm font-medium mb-2">
          Review Title
        </label>
        <input
          type="text"
          value={reviewTitle.value}
          onInput={(e) => reviewTitle.value = (e.target as HTMLInputElement).value}
          maxLength={maxTitleLength}
          placeholder="Brief summary of your review..."
          class="w-full px-3 py-2 bg-neutral-800 border border-neutral-700 rounded-md text-sm placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-neutral-500 focus:border-transparent"
          required
        />
        <div class="flex justify-between items-center mt-1">
          <div class="text-xs text-neutral-500">
            Keep it concise and descriptive
          </div>
          <div class={`text-xs ${titleCharCount > maxTitleLength * 0.9 ? 'text-yellow-400' : 'text-neutral-500'}`}>
            {titleCharCount}/{maxTitleLength}
          </div>
        </div>
      </div>

      {/* Review Description */}
      <div>
        <label class="block text-sm font-medium mb-2">
          Review Description
        </label>
        <textarea
          value={reviewDescription.value}
          onInput={(e) => reviewDescription.value = (e.target as HTMLTextAreaElement).value}
          placeholder="Share your detailed experience and feedback..."
          rows={4}
          class="w-full px-3 py-2 bg-neutral-800 border border-neutral-700 rounded-md text-sm placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-neutral-500 focus:border-transparent resize-vertical"
          required
        />
        <div class="text-xs text-neutral-500 mt-1">
          Be honest and constructive in your feedback
        </div>
      </div>

      {/* Submit Button */}
      <button
        type="submit"
        disabled={
          isSubmitting.value || 
          !selectedProfile.value || 
          !reviewTitle.value.trim() || 
          !reviewDescription.value.trim() || 
          !sentiment.value ||
          (reputationData.value?.authenticated && !canSubmit)
        }
        class={`w-full px-4 py-2 rounded-md font-medium transition-colors ${
          (reputationData.value?.authenticated && !canSubmit)
            ? "bg-red-900 text-red-300 cursor-not-allowed"
            : "bg-neutral-50 text-neutral-950 hover:bg-neutral-200 disabled:opacity-50 disabled:cursor-not-allowed"
        }`}
      >
        {isSubmitting.value 
          ? "Submitting..." 
          : (reputationData.value?.authenticated && !canSubmit)
          ? "Must be reputable to submit"
          : "Submit Anonymous Review"
        }
      </button>

      {/* Reputation Error Message */}
      {reputationData.value?.authenticated && !canSubmit && submitDisabledReason && (
        <div class="text-xs text-red-400 text-center">
          {submitDisabledReason}
        </div>
      )}

      {/* Demo Notice */}
      {!reputationData.value?.authenticated && (
        <div class="text-xs text-neutral-500 text-center">
          Connect with X to submit reviews. Must be reputable on Ethos to submit.
        </div>
      )}
    </form>
  );
} 