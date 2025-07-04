import { useSignal } from "@preact/signals";
import ReviewForm from "../islands/ReviewForm.tsx";
import AuthButton from "../islands/AuthButton.tsx";
import KairosAgentSidebar from "../islands/KairosAgentSidebar.tsx";

export default function Home() {
    return (
    <div class="min-h-screen bg-neutral-950 text-neutral-50">
      {/* Top Toolbar */}
      <div class="border-b border-neutral-800 bg-neutral-900/50 backdrop-blur-sm sticky top-0 z-10">
        <div class="container mx-auto px-4 py-4">
          <div class="flex justify-between items-center">
            <div class="flex items-center gap-3">
            </div>
            <AuthButton />
          </div>
        </div>
      </div>

      {/* Beta Banner */}
      <div class="bg-yellow-500/10 border-b border-yellow-500/20 overflow-hidden">
        <div class="animate-marquee whitespace-nowrap py-2">
          <span class="text-yellow-400 font-bold text-sm mx-8">ANON REVIEWS ARE IN BETA. PLEASE EXPECT TO BREAK IT.</span>
          <span class="text-yellow-400 font-bold text-sm mx-8">ANON REVIEWS ARE IN BETA. PLEASE EXPECT TO BREAK IT.</span>
          <span class="text-yellow-400 font-bold text-sm mx-8">ANON REVIEWS ARE IN BETA. PLEASE EXPECT TO BREAK IT.</span>
        </div>
      </div>

      {/* Main Content */}
      <div class="container mx-auto px-4 py-8">
        <div class="max-w-2xl mx-auto">
          {/* Review Form Card */}
          <div class="bg-neutral-900 border border-neutral-800 rounded-lg overflow-hidden">
            {/* Atmospheric Header Image */}
            <div class="relative h-48 bg-gradient-to-b from-neutral-800 to-neutral-900 overflow-hidden">
              <img 
                src="/anonymous-figure.png" 
                alt="Anonymous figure in shadows"
                class="w-full h-full object-cover object-center opacity-60"
                style="filter: grayscale(20%) contrast(1.1);"
              />
              <div class="absolute inset-0 bg-gradient-to-t from-neutral-900 via-transparent to-transparent"></div>
              <div class="absolute top-6 left-6">
                <h2 class="text-2xl font-semibold text-white drop-shadow-lg">Submit anon Ethos review</h2>
                <p class="text-sm text-neutral-300 mt-2 max-w-md drop-shadow">
                  Reputable or higher Ethos profiles can use this functionality to write reviews without revealing their identity. This app does not store any logs or information about who logs in or writes the reviews.
                </p>
              </div>
            </div>
            
            {/* Form Content */}
            <div class="px-8 pb-8">
              <ReviewForm />
            </div>
          </div>

          {/* KairosAgent Section - Below Form */}
          <div class="mt-8">
            <KairosAgentSidebar />
          </div>

          {/* Footer */}
          <div class="mt-12 text-center text-neutral-500">
            <p>
              Powered by{" "}
              <a 
                href="https://app.ethos.network" 
                target="_blank" 
                rel="noopener noreferrer"
                class="text-neutral-300 hover:text-neutral-100 underline"
              >
                Ethos
              </a>
              {" "}and{" "}
              <a 
                href="https://app.ethos.network/profile/x/kairosagent" 
                target="_blank" 
                rel="noopener noreferrer"
                class="text-neutral-300 hover:text-neutral-100 underline"
              >
                KairosAgent
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
        
        @keyframes marquee {
          0% {
            transform: translateX(100%);
          }
          100% {
            transform: translateX(-100%);
          }
        }
        
        .animate-slide-in {
          animation: slide-in 0.3s ease-out;
        }
        
        .animate-marquee {
          animation: marquee 20s linear infinite;
        }
      `}</style>
    </div>
  );
}
