import { useSignal } from "@preact/signals";
import EthosProfileSearch from "./EthosProfileSearch.tsx";

interface EthosProfile {
  id: string;
  username: string;
  avatar?: string;
  score: number;
}

export default function ReviewForm() {
  const selectedProfile = useSignal<EthosProfile | null>(null);
  const reviewTitle = useSignal("");
  const reviewDescription = useSignal("");
  const sentiment = useSignal<"negative" | "neutral" | "positive" | "">("");
  const isSubmitting = useSignal(false);

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

  return (
    <form onSubmit={handleSubmit} class="space-y-6">
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

      {/* Sentiment */}
      <div>
        <label class="block text-sm font-medium mb-2">
          Overall Sentiment
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

      {/* Submit Button */}
      <button
        type="submit"
        disabled={isSubmitting.value || !selectedProfile.value || !reviewTitle.value.trim() || !reviewDescription.value.trim() || !sentiment.value}
        class="w-full px-4 py-2 bg-neutral-50 text-neutral-950 rounded-md font-medium hover:bg-neutral-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        {isSubmitting.value ? "Submitting..." : "Submit Anonymous Review"}
      </button>

      {/* Demo Notice */}
      <div class="text-xs text-neutral-500 text-center">
        Demo mode - Reviews will be logged to console. Connect authentication to submit real reviews.
      </div>
    </form>
  );
} 