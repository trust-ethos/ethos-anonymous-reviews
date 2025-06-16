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
  const submitSuccess = useSignal<{
    transactionHash?: string;
    reviewId?: string;
    profileUsername?: string;
  } | null>(null);

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

  // Check if user is trying to review themselves
  const isReviewingSelf = () => {
    if (!reputationData.value?.authenticated || !reputationData.value?.user || !selectedProfile.value) {
      return false;
    }
    return reputationData.value.user.username.toLowerCase() === selectedProfile.value.username.toLowerCase();
  };

  const handleSubmit = async (e: Event) => {
    e.preventDefault();
    
    if (!selectedProfile.value || !reviewTitle.value.trim() || !reviewDescription.value.trim() || !sentiment.value) {
      alert("Please fill in all fields before submitting.");
      return;
    }

    // Prevent self-review
    if (isReviewingSelf()) {
      alert("You cannot leave a review for yourself.");
      return;
    }

    isSubmitting.value = true;
    
    try {
      console.log("Getting CSRF token...");
      
      // Get CSRF token first
      const csrfResponse = await fetch("/api/auth/csrf");
      if (!csrfResponse.ok) {
        throw new Error("Failed to get CSRF token");
      }
      const csrfData = await csrfResponse.json();
      const csrfToken = csrfData.csrfToken;
      
      console.log("Submitting review to blockchain:", {
        profile: selectedProfile.value,
        title: reviewTitle.value,
        description: reviewDescription.value,
        sentiment: sentiment.value
      });

      const response = await fetch("/api/reviews/submit", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          profileId: selectedProfile.value.profileId,
          profileUsername: selectedProfile.value.username,
          title: reviewTitle.value,
          description: reviewDescription.value,
          sentiment: sentiment.value,
          csrfToken: csrfToken,
          requestNonce: crypto.randomUUID(), // Generate proper unique nonce
          reviewerReputationLevel: reputationData.value?.reputation?.level || "reputable", // Pass known reputation level
        }),
      });

      const result = await response.json();

      if (response.ok) {
        console.log("✅ Review submitted successfully:", result);
        
        // Show success notification
        submitSuccess.value = {
          transactionHash: result.transactionHash,
          reviewId: result.reviewId
        };
        
        // Reset form
        selectedProfile.value = null;
        reviewTitle.value = "";
        reviewDescription.value = "";
        sentiment.value = "";
      } else {
        console.error("❌ Review submission failed:", result);
        alert(`Failed to submit review: ${result.error || "Unknown error"}`);
      }
    } catch (error) {
      console.error("❌ Review submission error:", error);
      alert(`Error submitting review: ${error instanceof Error ? error.message : "Unknown error"}`);
    } finally {
      isSubmitting.value = false;
    }
  };

  const titleCharCount = reviewTitle.value.length;
  const maxTitleLength = 120;

  const canSubmit = reputationData.value?.reputation?.canSubmit ?? false;
  const submitDisabledReason = reputationData.value?.reputation?.reason || reputationData.value?.reason;
  const isSelfReview = isReviewingSelf();

  return (
    <form onSubmit={handleSubmit} class="space-y-6">
      {/* Success Notification */}
      {submitSuccess.value && (
        <div class="bg-green-900/20 border border-green-700/50 rounded-lg p-6">
          <div class="flex items-start gap-3">
            <div class="flex-shrink-0">
              <svg class="w-6 h-6 text-green-400" fill="currentColor" viewBox="0 0 24 24">
                <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/>
              </svg>
            </div>
            <div class="flex-1">
              <h3 class="text-lg font-semibold text-green-300 mb-2">Review Submitted Successfully!</h3>
              <p class="text-green-200 mb-4">Your anonymous review has been recorded on the blockchain.</p>
              
                <p class="text-green-200 mb-4">
                  You'll be able to see it on Ethos shortly under the{" "}
                  <a 
                    href={`https://app.ethos.network/profile/x/kairosAgent`}
                    target="_blank"
                    rel="noopener noreferrer"
                    class="text-green-300 hover:text-green-200 underline"
                  >
                    kairosAgent
                  </a>{" "}
                  profile.
                </p>
              
              <div class="space-y-3">
                {submitSuccess.value.transactionHash && (
                  <div>
                    <div class="text-sm font-medium text-green-300 mb-1">Transaction Hash:</div>
                    <div class="font-mono text-xs text-green-200 bg-green-900/30 p-2 rounded border break-all">
                      {submitSuccess.value.transactionHash}
                    </div>
                    <a 
                      href={`https://basescan.org/tx/${submitSuccess.value.transactionHash}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      class="inline-flex items-center gap-1 text-sm text-green-400 hover:text-green-300 mt-1"
                    >
                      View on BaseScan
                      <svg class="w-3 h-3" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M14,3V5H17.59L7.76,14.83L9.17,16.24L19,6.41V10H21V3M19,19H5V5H12V3H5C3.89,3 3,3.9 3,5V19A2,2 0 0,0 5,21H19A2,2 0 0,0 21,19V12H19V19Z"/>
                      </svg>
                    </a>
                  </div>
                )}
                
                {submitSuccess.value.reviewId && (
                  <div>
                    <a 
                      href={`https://app.ethos.network/activity/review/${submitSuccess.value.reviewId}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      class="inline-flex items-center gap-1 text-sm text-green-400 hover:text-green-300"
                    >
                      View Review on Ethos
                      <svg class="w-3 h-3" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M14,3V5H17.59L7.76,14.83L9.17,16.24L19,6.41V10H21V3M19,19H5V5H12V3H5C3.89,3 3,3.9 3,5V19A2,2 0 0,0 5,21H19A2,2 0 0,0 21,19V12H19V19Z"/>
                      </svg>
                    </a>
                  </div>
                )}
              </div>
              
              <button
                type="button"
                onClick={() => submitSuccess.value = null}
                class="mt-4 text-sm text-green-400 hover:text-green-300 underline"
              >
                Submit Another Review
              </button>
            </div>
          </div>
        </div>
      )}

      {/* You Section - Show when authenticated and reputable */}
      {reputationData.value?.authenticated && canSubmit && (
        <div>
          <label class="block text-sm font-medium mb-2">
            You
          </label>
          <div class={`flex items-center gap-3 p-3 border border-neutral-700 rounded-md ${
            reputationData.value.reputation?.level === 'exemplary' 
              ? 'bg-green-900/20 border-green-700/50' 
              : reputationData.value.reputation?.level === 'reputable'
              ? 'bg-blue-900/20 border-blue-700/50'
              : 'bg-neutral-800'
          }`}>
            <div class={`w-10 h-10 rounded-full flex items-center justify-center text-neutral-300 ${
              reputationData.value.reputation?.level === 'exemplary' 
                ? 'bg-green-800' 
                : reputationData.value.reputation?.level === 'reputable'
                ? 'bg-blue-800'
                : 'bg-neutral-600'
            }`}>
              <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>
              </svg>
            </div>
            <div class="flex-1">
              <div class="text-sm font-medium">
                Anonymous {reputationData.value.reputation?.level || "user"}
              </div>
              <div class="text-xs text-neutral-400">
                {reputationData.value.reputation ? 
                  "Reputation verified" : 
                  "Reputation unknown"
                }
              </div>
            </div>
          </div>
          <div class="text-xs text-neutral-400 mt-2">
            Your review will be saved anonymously. Only the score level you are in will be revealed.
          </div>
        </div>
      )}

      {/* Profile Search */}
      <div>
        <label class="block text-sm font-medium mb-2">
          Search X account or ENS
        </label>
        <EthosProfileSearch 
          selectedProfile={selectedProfile}
          onProfileSelect={(profile) => selectedProfile.value = profile}
        />
        
        {/* Self-review warning */}
        {isSelfReview && (
          <div class="mt-2 p-3 bg-yellow-900/20 border border-yellow-700/50 rounded-md">
            <div class="flex items-center gap-2">
              <svg class="w-4 h-4 text-yellow-400 flex-shrink-0" fill="currentColor" viewBox="0 0 24 24">
                <path d="M1 21h22L12 2 1 21zm12-3h-2v-2h2v2zm0-4h-2v-4h2v4z"/>
              </svg>
              <div class="text-sm text-yellow-300">
                You cannot leave a review for yourself (@{selectedProfile.value?.username}).
              </div>
            </div>
          </div>
        )}
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
        <div class="flex justify-end items-center mt-1">
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
          Please be thoughtful about what you write. Including evidence is always wise, especially when anonymous. Messages of hate or violence may be removed from the Ethos.network website per our <a href="https://ethos.network/terms" target="_blank" rel="noopener noreferrer" class="text-neutral-400 hover:text-neutral-300 underline">Terms of Service</a>.
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
          (reputationData.value?.authenticated && !canSubmit) ||
          !reputationData.value?.authenticated ||
          isSelfReview
        }
        class={`w-full px-4 py-2 rounded-md font-medium transition-colors ${
          isSelfReview
            ? "bg-yellow-900 text-yellow-300 cursor-not-allowed"
            : (reputationData.value?.authenticated && !canSubmit)
            ? "bg-red-900 text-red-300 cursor-not-allowed"
            : !reputationData.value?.authenticated
            ? "bg-neutral-700 text-neutral-400 cursor-not-allowed"
            : "bg-neutral-50 text-neutral-950 hover:bg-neutral-200 disabled:opacity-50 disabled:cursor-not-allowed"
        }`}
      >
        {isSubmitting.value 
          ? "Submitting..." 
          : isSelfReview
          ? "Cannot review yourself"
          : !reputationData.value?.authenticated
          ? "Please login"
          : (reputationData.value?.authenticated && !canSubmit)
          ? "Must be reputable to submit"
          : "Submit Anonymous Review"
        }
      </button>

      {/* Self-review Error Message */}
      {isSelfReview && (
        <div class="text-xs text-yellow-400 text-center">
          You cannot leave a review for your own profile.
        </div>
      )}

      {/* Reputation Error Message */}
      {reputationData.value?.authenticated && !canSubmit && !isSelfReview && submitDisabledReason && (
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