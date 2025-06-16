import { useSignal } from "@preact/signals";

export default function AuthButton() {
  const isConnected = useSignal(false);

  const handleConnect = () => {
    isConnected.value = !isConnected.value;
  };

  if (isConnected.value) {
    return (
      <div class="flex items-center gap-3">
        <div class="flex items-center gap-2">
          <div class="w-6 h-6 rounded-full bg-neutral-600"></div>
          <div class="text-sm text-neutral-400">
            @demo_user
          </div>
        </div>
        <button
          onClick={handleConnect}
          class="px-4 py-2 bg-neutral-800 border border-neutral-700 rounded-md text-sm font-medium hover:bg-neutral-700 transition-colors"
        >
          Disconnect
        </button>
      </div>
    );
  }

  return (
    <button
      onClick={handleConnect}
      class="px-4 py-2 bg-neutral-800 border border-neutral-700 rounded-md text-sm font-medium hover:bg-neutral-700 transition-colors flex items-center gap-2"
    >
      <svg class="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
        <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
      </svg>
      Connect with X
    </button>
  );
} 