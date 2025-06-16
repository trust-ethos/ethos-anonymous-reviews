import { useSignal } from "@preact/signals";
import EthosProfileSearch from "../islands/EthosProfileSearch.tsx";
import ReviewForm from "../islands/ReviewForm.tsx";
import AuthButton from "../islands/AuthButton.tsx";

export default function Home() {
  return (
    <div class="min-h-screen bg-neutral-950 text-neutral-50">
      <div class="container mx-auto px-4 py-16">
        <div class="max-w-4xl mx-auto">
          {/* Header */}
          <div class="text-center mb-16">
            <div class="flex justify-end mb-8">
              <AuthButton />
            </div>
            <h1 class="text-4xl md:text-6xl font-bold tracking-tight mb-6">
              Ethos Anonymous Reviews
            </h1>
            <p class="text-xl text-neutral-400 max-w-2xl mx-auto">
              Share honest, anonymous feedback about Ethos profiles. Help build a transparent community through authentic reviews.
            </p>
          </div>

          {/* Main Content */}
          <div class="max-w-2xl mx-auto">
            {/* Submit Review Card */}
            <div class="bg-neutral-900 border border-neutral-800 rounded-lg p-6">
              <div class="mb-6">
                <h2 class="text-xl font-semibold mb-2">Submit a Review</h2>
                <p class="text-neutral-400 text-sm">
                  Leave an anonymous review for an Ethos profile
                </p>
              </div>
              <ReviewForm />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
