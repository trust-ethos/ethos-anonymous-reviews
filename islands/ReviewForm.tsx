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
  const sentiment = useSignal<"negative" | "neutral" | "positive" | "slash" | "">("");
  const isSubmitting = useSignal(false);
  const reputationData = useSignal<ReputationData | null>(null);
  const isLoadingReputation = useSignal(true);
  const kairosScore = useSignal<number>(0);
  const submitSuccess = useSignal<{
    transactionHash?: string;
    reviewId?: string;
    profileUsername?: string;
    message?: string;
    links?: {
      ethosReview?: string;
      basescan?: string;
    };
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

  // The form sits in an e-card, so its fields take the base surface to stand apart from it.
  const fieldSurface = "background: var(--ethos-bg-base)";
  const isSlashSuccess = submitSuccess.value?.message?.includes("Slash request");

  return (
    <form onSubmit={handleSubmit} class="space-y-6">
      {/* Success Notification */}
      {submitSuccess.value && (
        <div class={`e-alert p-4 ${isSlashSuccess ? "error" : "success"}`}>
          {isSlashSuccess ? (
            <span
              class="ei ei-slash-filled mt-1"
              style="font-size: var(--ethos-font-size-lg); color: var(--ethos-danger-default)"
              aria-hidden="true"
            >
            </span>
          ) : (
            <span
              class="ei ei-check-circle-filled mt-1"
              style="font-size: var(--ethos-font-size-lg); color: var(--ethos-success-default)"
              aria-hidden="true"
            >
            </span>
          )}
          <div class="flex-1 min-w-0">
            <h3 class="e-text lg sans mb-1">
              {isSlashSuccess 
                ? "Slash Request Submitted!" 
                : "Review Confirmed on Blockchain!"
              }
            </h3>
            <p class="e-text md body mb-4">
              {submitSuccess.value.message || "Review submitted and confirmed!"}
            </p>
            
            {/* Direct Review Link - Only for regular reviews, not slash requests */}
            {!isSlashSuccess && (submitSuccess.value.reviewId || submitSuccess.value.links?.ethosReview) && (
              <div class="mb-4">
                <a 
                  href={submitSuccess.value.links?.ethosReview || `https://app.ethos.network/activity/review/${submitSuccess.value.reviewId}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  class="e-link inline-flex items-center gap-2"
                  style="font-size: var(--ethos-font-size-md); font-weight: var(--ethos-font-weight-semibold)"
                >
                  View Your Review on Ethos
                  <span class="ei ei-open-in-new" aria-hidden="true"></span>
                </a>
              </div>
            )}
            
            <div class="space-y-3">
              {!isSlashSuccess && submitSuccess.value.transactionHash && (
                <div>
                  <div class="e-label">Transaction Hash:</div>
                  <div class="e-sunken e-text sm mono body p-2 break-all">
                    {submitSuccess.value.transactionHash}
                  </div>
                  <a 
                    href={submitSuccess.value.links?.basescan || `https://basescan.org/tx/${submitSuccess.value.transactionHash}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    class="e-link inline-flex items-center gap-1 mt-1"
                  >
                    View on BaseScan
                    <span class="ei ei-open-in-new" aria-hidden="true"></span>
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
              class="e-btn link mt-4"
            >
              Submit Another Review
            </button>
          </div>
        </div>
      )}

      {/* You Section - Show when authenticated and reputable */}
      {reputationData.value?.authenticated && canSubmit && (
        <div>
          <label class="e-label">
            You
          </label>
          <div class="e-surface flex items-center gap-3">
            <div class="e-avatar">
              <span
                class="ph"
                style={{
                  color: reputationData.value.reputation?.level === 'exemplary'
                    ? 'var(--ethos-level-exemplary)'
                    : reputationData.value.reputation?.level === 'reputable'
                    ? 'var(--ethos-level-reputable)'
                    : 'var(--ethos-text-muted)',
                }}
              >
                <span
                  class="ei ei-m-person-outlined"
                  style="font-size: var(--ethos-font-size-h4)"
                  aria-hidden="true"
                >
                </span>
              </span>
            </div>
            <div class="flex-1 min-w-0">
              <div class="e-text md sans">
                Anonymous Reputable+ user
              </div>
              <div class="e-text sm muted">
                {reputationData.value.reputation ? 
                  "Reputation verified" : 
                  "Reputation unknown"
                }
              </div>
            </div>
          </div>
          <div class="e-help">
            Your review will be saved anonymously. You will appear as a "Reputable+" user to protect your identity.
          </div>
        </div>
      )}

      {/* Profile Search */}
      <div>
        <label class="e-label">
          Search X account or ENS
        </label>
        <EthosProfileSearch 
          selectedProfile={selectedProfile}
          onProfileSelect={(profile) => selectedProfile.value = profile}
        />
        
        {/* Self-review warning */}
        {isSelfReview && (
          <div class="e-alert warning mt-2">
            <span class="ic"></span>
            <div>
              You cannot leave a review for yourself (@{selectedProfile.value?.username}).
            </div>
          </div>
        )}
      </div>

      {/* Sentiment */}
      <div>
        <label class="e-label">
          Review type
        </label>
        <div class="e-toggle flex-wrap">
          {[
            { value: "negative", label: "Negative", icon: "ei-dislike-filled", color: "var(--ethos-danger-default)", disabled: false },
            { value: "neutral", label: "Neutral", icon: "ei-like-dislike", color: "currentColor", disabled: false },
            { value: "positive", label: "Positive", icon: "ei-like-filled", color: "var(--ethos-success-default)", disabled: false },
            ...(kairosScore.value >= 1400 ? [{ value: "slash", label: "Slash", icon: "ei-slash-filled", color: "var(--ethos-danger-default)", disabled: false }] : []),
          ].map((option) => (
            <div key={option.value} class="relative">
              <button
                type="button"
                onClick={() => !option.disabled && (sentiment.value = option.value as any)}
                disabled={option.disabled}
                aria-pressed={sentiment.value === option.value}
                class={`e-btn ${sentiment.value === option.value ? "active" : "layer"}`}
                title={option.disabled ? "Coming soon" : undefined}
              >
                <span
                  class={`ei ${option.icon}`}
                  style={option.disabled ? undefined : { color: option.color }}
                  aria-hidden="true"
                >
                </span>
                {option.label}
              </button>
              {option.disabled && (
                <div class="e-tooltip absolute -top-8 left-1/2 transform -translate-x-1/2 opacity-0 hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap">
                  Coming soon
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Slash Disclaimer */}
      {sentiment.value === "slash" && (
        <div class="e-alert error p-4 mb-6">
          <span
            class="ei ei-slash-filled mt-1"
            style="font-size: var(--ethos-font-size-lg); color: var(--ethos-danger-default)"
            aria-hidden="true"
          >
          </span>
          <div>
            <h4 class="e-text md sans mb-1">Slash Request Information</h4>
            <p class="e-text sm body">
              Slashes are proposed and then handled manually. We will process your slash once we are capable of doing so. The Ethos team reserves the right to refrain from following through with the slash if they feel it violates the purpose of this app or the Ethos T&Cs. All slashes are for 50 credibility score.
            </p>
          </div>
        </div>
      )}

      {/* Review Title */}
      <div>
        <label class="e-label">
          {sentiment.value === "slash" ? "Slash title" : "Review title"}
        </label>
        <div class="e-input" style={fieldSurface}>
          <input
            type="text"
            value={reviewTitle.value}
            onInput={(e) => reviewTitle.value = (e.target as HTMLInputElement).value}
            maxLength={maxTitleLength}
            placeholder="Brief summary of your review..."
            required
          />
        </div>
        <div class="flex justify-end items-center mt-1">
          <div class={`e-text sm ${titleCharCount > maxTitleLength * 0.9 ? 'warning' : 'faint'}`}>
            {titleCharCount}/{maxTitleLength}
          </div>
        </div>
      </div>

      {/* Review Description */}
      <div>
        <label class="e-label">
          {sentiment.value === "slash" ? "Slash description" : "Review description"}
        </label>
        <div class="e-input textarea" style={fieldSurface}>
          <textarea
            value={reviewDescription.value}
            onInput={(e) => reviewDescription.value = (e.target as HTMLTextAreaElement).value}
            placeholder="Share your detailed experience and feedback..."
            rows={4}
            required
          />
        </div>
        <div class="e-help">
          Please be thoughtful about what you write. Including evidence is always wise, especially when anonymous. Messages of hate or violence may be removed from the Ethos.network website per our <a href="https://ethos.network/terms" target="_blank" rel="noopener noreferrer" class="e-link">Terms of Service</a>.
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
        class={`e-btn lg block ${
          isSelfReview ||
          (reputationData.value?.authenticated && !canSubmit) ||
          !reputationData.value?.authenticated
            ? "layer"
            : "primary"
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
        <div class="e-text sm warning text-center">
          You cannot leave a review for your own profile.
        </div>
      )}

      {/* Reputation Error Message */}
      {reputationData.value?.authenticated && !canSubmit && !isSelfReview && submitDisabledReason && (
        <div class="e-text sm danger text-center">
          {submitDisabledReason}
        </div>
      )}

      {/* Demo Notice */}
      {!reputationData.value?.authenticated && (
        <div class="e-text sm faint text-center">
          Connect with X to submit reviews. Must be reputable on Ethos to submit.
        </div>
      )}
    </form>
  );
} 