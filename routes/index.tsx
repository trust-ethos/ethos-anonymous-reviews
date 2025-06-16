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
              Leave anonymous reviews for Ethos profiles. Your identity stays private, 
              but your reputation matters.
            </p>
          </div>

          {/* Main Content */}
          <div class="grid lg:grid-cols-2 gap-12">
            {/* Profile Search */}
            <div>
              <h2 class="text-2xl font-semibold mb-6">Find Profile</h2>
              <EthosProfileSearch />
            </div>

            {/* Review Form */}
            <div>
              <h2 class="text-2xl font-semibold mb-6">Submit Review</h2>
              <ReviewForm />
            </div>
          </div>

          {/* Footer */}
          <div class="mt-24 text-center text-neutral-500">
            <p>
              Powered by{" "}
              <a 
                href="https://ethos.network" 
                target="_blank" 
                rel="noopener noreferrer"
                class="text-neutral-300 hover:text-neutral-100 underline"
              >
                Ethos Network
              </a>
              {" "}and{" "}
              <a 
                href="https://base.org" 
                target="_blank" 
                rel="noopener noreferrer"
                class="text-neutral-300 hover:text-neutral-100 underline"
              >
                Base
              </a>
            </p>
          </div>
        </div>
      </div>
      
      <style>{`
        @keyframes slide-in {
          from {
            transform: translateX(100%);
            opacity: 0;
          }
          to {
            transform: translateX(0);
            opacity: 1;
          }
        }
        
        .animate-slide-in {
          animation: slide-in 0.3s ease-out;
        }
      `}</style>
    </div>
  );
}
