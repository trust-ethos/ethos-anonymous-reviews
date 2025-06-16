import { useSignal } from "@preact/signals";
import ReviewForm from "../islands/ReviewForm.tsx";
import AuthButton from "../islands/AuthButton.tsx";

export default function Home() {
  return (
    <div class="min-h-screen bg-neutral-950 text-neutral-50">
      {/* Beta Banner */}
      <div class="bg-yellow-500/10 border-b border-yellow-500/20 overflow-hidden">
        <div class="animate-marquee whitespace-nowrap py-2">
          <span class="text-yellow-400 font-bold text-sm mx-8">BETA</span>
          <span class="text-yellow-400 font-bold text-sm mx-8">BETA</span>
          <span class="text-yellow-400 font-bold text-sm mx-8">BETA</span>
          <span class="text-yellow-400 font-bold text-sm mx-8">BETA</span>
          <span class="text-yellow-400 font-bold text-sm mx-8">BETA</span>
          <span class="text-yellow-400 font-bold text-sm mx-8">BETA</span>
          <span class="text-yellow-400 font-bold text-sm mx-8">BETA</span>
          <span class="text-yellow-400 font-bold text-sm mx-8">BETA</span>
          <span class="text-yellow-400 font-bold text-sm mx-8">BETA</span>
          <span class="text-yellow-400 font-bold text-sm mx-8">BETA</span>
        </div>
      </div>

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

      {/* Main Content */}
      <div class="container mx-auto px-4 py-16">
        <div class="max-w-2xl mx-auto">
          {/* Header */}
          <div class="text-center mb-16">
            <h1 class="text-4xl md:text-6xl font-bold tracking-tight mb-6">
              Ethos Anonymous Reviews
            </h1>
            <p class="text-xl text-neutral-400 max-w-2xl mx-auto">
              Leave anonymous reviews on Ethos for any X account or ENS name. <br /> Only reputable or higher Ethos profiles can use this functionality.
            </p>
          </div>

          {/* Review Form Card */}
          <div class="bg-neutral-900 border border-neutral-800 rounded-lg overflow-hidden">
            {/* Atmospheric Header Image */}
            <div class="relative h-32 bg-gradient-to-b from-neutral-800 to-neutral-900 overflow-hidden">
              <img 
                src="/anonymous-figure.png" 
                alt="Anonymous figure in shadows"
                class="w-full h-full object-cover object-center opacity-60"
                style="filter: grayscale(20%) contrast(1.1);"
              />
              <div class="absolute inset-0 bg-gradient-to-t from-neutral-900 via-transparent to-transparent"></div>
              <div class="absolute bottom-4 left-6">
                <h2 class="text-2xl font-semibold text-white drop-shadow-lg">Submit Anonymous Review</h2>
              </div>
            </div>
            
            {/* Form Content */}
            <div class="p-8">
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
                Ethos
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
          animation: marquee 15s linear infinite;
        }
      `}</style>
    </div>
  );
}
