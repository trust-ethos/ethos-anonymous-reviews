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
  const kairosScore = useSignal<number>(0);
  const submitSuccess = useSignal<{
    transactionHash?: string;
    reviewId?: string;
    profileUsername?: string;
  } | null>(null);

  useEffect(() => {
    // Check user reputation and KairosAgent score on component mount
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

    const fetchKairosScore = async () => {
      try {
        const response = await fetch('/api/kairos-stats');
        if (response.ok) {
          const data = await response.json();
          kairosScore.value = data.score || 0;
        }
      } catch (error) {
        console.log('Failed to fetch KairosAgent score:', error);
      }
    };

    checkReputation();
    fetchKairosScore();
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
    
    // Enhanced validation with specific error messages
    if (!selectedProfile.value) {
      alert("Please search for and select a profile to review.");
      return;
    }
    
    if (!reviewTitle.value.trim()) {
      alert("Please enter a review title.");
      return;
    }
    
    if (!reviewDescription.value.trim()) {
      alert("Please enter a review description.");
      return;
    }
    
    if (!sentiment.value) {
      alert("Please select a review type (Negative, Neutral, or Positive).");
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
      
      // Handle slash requests differently
      if (sentiment.value === "slash") {
        console.log("Submitting slash request:", {
          profile: selectedProfile.value,
          title: reviewTitle.value,
          description: reviewDescription.value,
          sentiment: sentiment.value
        });

        const response = await fetch("/api/slash/submit", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            profileId: selectedProfile.value.profileId,
            profileUsername: selectedProfile.value.username,
            title: reviewTitle.value,
            description: reviewDescription.value,
            csrfToken: csrfToken,
            requestNonce: crypto.randomUUID(),
            reviewerReputationLevel: reputationData.value?.reputation?.level || "reputable",
          }),
        });

        const result = await response.json();

        if (response.ok) {
          console.log("✅ Slash request submitted:", result);
          
          // Show success notification for slash request
          submitSuccess.value = {
            message: "Slash request submitted successfully! We will review and process your request manually.",
            profileUsername: selectedProfile.value.username,
          };
          
          // Reset form
          selectedProfile.value = null;
          reviewTitle.value = "";
          reviewDescription.value = "";
          sentiment.value = "";
        } else {
          console.error("❌ Slash request failed:", result);
          alert(`Failed to submit slash request: ${result.error || "Unknown error"}`);
        }
        return;
      }
      
      console.log("Submitting review to blockchain (this may take 30-60 seconds):", {
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
        console.log("✅ Review confirmed on blockchain:", result);
        
        // Show success notification with enhanced data
        submitSuccess.value = {
          transactionHash: result.transactionHash,
          reviewId: result.reviewId,
          profileUsername: selectedProfile.value.username,
          message: result.message,
          links: result.links
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
        <div class={`rounded-lg p-6 ${
          submitSuccess.value.message?.includes("Slash request") 
            ? "bg-red-900/20 border border-red-700/50" 
            : "bg-green-900/20 border border-green-700/50"
        }`}>
          <div class="flex items-start gap-3">
            <div class="flex-shrink-0">
              <svg class={`w-6 h-6 ${
                submitSuccess.value.message?.includes("Slash request") 
                  ? "text-red-400" 
                  : "text-green-400"
              }`} fill="currentColor" viewBox="0 0 24 24">
                <path d={
                  submitSuccess.value.message?.includes("Slash request")
                    ? "M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"
                    : "M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"
                }/>
              </svg>
            </div>
            <div class="flex-1">
              <h3 class={`text-lg font-semibold mb-2 ${
                submitSuccess.value.message?.includes("Slash request") 
                  ? "text-red-300" 
                  : "text-green-300"
              }`}>
                {submitSuccess.value.message?.includes("Slash request") 
                  ? "Slash Request Submitted!" 
                  : "Review Confirmed on Blockchain!"
                }
              </h3>
              <p class={`mb-4 ${
                submitSuccess.value.message?.includes("Slash request") 
                  ? "text-red-200" 
                  : "text-green-200"
              }`}>
                {submitSuccess.value.message || "Review submitted and confirmed!"}
              </p>
              
              {/* Direct Review Link - Only for regular reviews, not slash requests */}
              {!submitSuccess.value.message?.includes("Slash request") && (submitSuccess.value.reviewId || submitSuccess.value.links?.ethosReview) && (
                <div class="mb-4">
                  <a 
                    href={submitSuccess.value.links?.ethosReview || `https://app.ethos.network/activity/review/${submitSuccess.value.reviewId}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    class="inline-flex items-center gap-2 text-green-300 hover:text-green-200 font-medium text-base underline"
                  >
                    View Your Review on Ethos
                    <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M14,3V5H17.59L7.76,14.83L9.17,16.24L19,6.41V10H21V3M19,19H5V5H12V3H5C3.89,3 3,3.9 3,5V19A2,2 0 0,0 5,21H19A2,2 0 0,0 21,19V12H19V19Z"/>
                    </svg>
                  </a>
                </div>
              )}
              
              <div class="space-y-3">
                {!submitSuccess.value.message?.includes("Slash request") && submitSuccess.value.transactionHash && (
                  <div>
                    <div class="text-sm font-medium text-green-300 mb-1">Transaction Hash:</div>
                    <div class="font-mono text-xs text-green-200 bg-green-900/30 p-2 rounded border break-all">
                      {submitSuccess.value.transactionHash}
                    </div>
                    <a 
                      href={submitSuccess.value.links?.basescan || `https://basescan.org/tx/${submitSuccess.value.transactionHash}`}
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

              </div>
              
              <button
                type="button"
                onClick={() => {
                  // Clear success state
                  submitSuccess.value = null;
                  // Clear all form fields to prevent accidental resubmission
                  selectedProfile.value = null;
                  reviewTitle.value = "";
                  reviewDescription.value = "";
                  sentiment.value = "";
                }}
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
          Review type
        </label>
        <div class="flex gap-2">
          {[
            { value: "negative", label: "Negative", color: "text-red-400 border-red-400", disabled: false },
            { value: "neutral", label: "Neutral", color: "text-yellow-400 border-yellow-400", disabled: false },
            { value: "positive", label: "Positive", color: "text-green-400 border-green-400", disabled: false },
            ...(kairosScore.value >= 1400 ? [{ value: "slash", label: "Slash", color: "text-red-400 border-red-400", disabled: false }] : []),
          ].map((option) => (
            <div key={option.value} class="relative">
              <button
                type="button"
                onClick={() => !option.disabled && (sentiment.value = option.value as any)}
                disabled={option.disabled}
                class={`px-4 py-2 border rounded-md text-sm font-medium transition-colors ${
                  option.disabled
                    ? "border-neutral-700 text-neutral-500 cursor-not-allowed opacity-50"
                    : sentiment.value === option.value
                    ? `${option.color} bg-opacity-10`
                    : "border-neutral-700 text-neutral-400 hover:border-neutral-600"
                }`}
                title={option.disabled ? "Coming soon" : undefined}
              >
                {option.label}
              </button>
              {option.disabled && (
                <div class="absolute -top-8 left-1/2 transform -translate-x-1/2 bg-neutral-800 text-neutral-200 text-xs px-2 py-1 rounded shadow-lg opacity-0 hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap">
                  Coming soon
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Slash Disclaimer */}
      {sentiment.value === "slash" && (
        <div class="bg-red-900/20 border border-red-700/50 rounded-lg p-4 mb-6">
          <div class="flex items-start gap-3">
            <div class="flex-shrink-0">
              <svg class="w-5 h-5 text-red-400 mt-0.5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
              </svg>
            </div>
            <div>
              <h4 class="text-sm font-medium text-red-300 mb-2">Slash Request Information</h4>
              <p class="text-sm text-red-200 leading-relaxed">
                Slashes are proposed and then handled manually. We will process your slash once we are capable of doing so. The Ethos team reserves the right to refrain from following through with the slash if they feel it violates the purpose of this app or the Ethos T&Cs. All slashes are for 50 credibility score.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Review Title */}
      <div>
        <label class="block text-sm font-medium mb-2">
          {sentiment.value === "slash" ? "Slash title" : "Review title"}
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
          {sentiment.value === "slash" ? "Slash description" : "Review description"}
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
          ? (sentiment.value === "slash" ? "Submitting slash request..." : "Confirming on blockchain...") 
          : isSelfReview
          ? "Cannot review yourself"
          : !reputationData.value?.authenticated
          ? "Please login"
          : (reputationData.value?.authenticated && !canSubmit)
          ? "Must be reputable to submit"
          : (sentiment.value === "slash" ? "Request slash" : "Submit anon review")
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