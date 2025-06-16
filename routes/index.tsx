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
          <div class="grid md:grid-cols-2 gap-8 mb-16">
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

            {/* How It Works Card */}
            <div class="bg-neutral-900 border border-neutral-800 rounded-lg p-6">
              <div class="mb-6">
                <h2 class="text-xl font-semibold mb-2">How It Works</h2>
                <p class="text-neutral-400 text-sm">
                  Anonymous, authentic reviews made simple
                </p>
              </div>
              <div class="space-y-4">
                <div class="flex gap-3">
                  <div class="flex-shrink-0 w-6 h-6 rounded-full bg-neutral-50 text-neutral-950 text-sm flex items-center justify-center font-medium">
                    1
                  </div>
                  <div>
                    <h4 class="font-medium">Search Profile</h4>
                    <p class="text-sm text-neutral-400">
                      Find the Ethos profile you want to review
                    </p>
                  </div>
                </div>
                <div class="flex gap-3">
                  <div class="flex-shrink-0 w-6 h-6 rounded-full bg-neutral-50 text-neutral-950 text-sm flex items-center justify-center font-medium">
                    2
                  </div>
                  <div>
                    <h4 class="font-medium">Submit Your Review</h4>
                    <p class="text-sm text-neutral-400">
                      Share honest feedback about Ethos profiles
                    </p>
                  </div>
                </div>
                <div class="flex gap-3">
                  <div class="flex-shrink-0 w-6 h-6 rounded-full bg-neutral-50 text-neutral-950 text-sm flex items-center justify-center font-medium">
                    3
                  </div>
                  <div>
                    <h4 class="font-medium">Stay Anonymous</h4>
                    <p class="text-sm text-neutral-400">
                      Your identity remains completely private
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Features */}
          <div class="grid md:grid-cols-3 gap-6">
            <div class="bg-neutral-900 border border-neutral-800 rounded-lg p-6">
              <h3 class="text-lg font-semibold mb-3">🔒 Anonymous</h3>
              <p class="text-sm text-neutral-400">
                Your reviews are completely anonymous while still being authenticated.
              </p>
            </div>
            <div class="bg-neutral-900 border border-neutral-800 rounded-lg p-6">
              <h3 class="text-lg font-semibold mb-3">🛡️ Secure</h3>
              <p class="text-sm text-neutral-400">
                Built with security best practices for safe and reliable reviews.
              </p>
            </div>
            <div class="bg-neutral-900 border border-neutral-800 rounded-lg p-6">
              <h3 class="text-lg font-semibold mb-3">🎯 Transparent</h3>
              <p class="text-sm text-neutral-400">
                Help build a more trustworthy crypto ecosystem through honest feedback.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
