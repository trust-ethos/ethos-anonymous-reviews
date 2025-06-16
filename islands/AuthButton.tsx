import { useSignal } from "@preact/signals";
import { useEffect, useState } from "preact/hooks";

export default function AuthButton() {
  const [isClient, setIsClient] = useState(false);
  
  // Demo state
  const isConnected = useSignal(false);
  const mockUser = useSignal({
    username: "demo_user",
    name: "Demo User",
    profilePictureUrl: "https://pbs.twimg.com/profile_images/1234567890/demo.jpg"
  });

  useEffect(() => {
    setIsClient(true);
  }, []);

  const handleConnect = () => {
    if (isConnected.value) {
      isConnected.value = false;
    } else {
      // For now, just use demo mode
      alert("Demo mode: Twitter authentication will be added soon!");
      isConnected.value = true;
    }
  };

  if (!isClient) {
    return (
      <button class="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors">
        Connect X
      </button>
    );
  }

  // Show demo user if connected
  if (isConnected.value) {
    return (
      <div class="flex items-center gap-3">
        <div class="flex items-center gap-2">
          <div class="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-white text-sm font-medium">
            {mockUser.value.username.charAt(0).toUpperCase()}
          </div>
          <div class="text-sm">
            <div class="font-medium">@{mockUser.value.username}</div>
            <div class="text-neutral-400 text-xs">{mockUser.value.name} (Demo)</div>
          </div>
        </div>
        <button
          onClick={handleConnect}
          class="px-3 py-1 text-sm bg-neutral-700 text-neutral-300 rounded hover:bg-neutral-600 transition-colors"
        >
          Disconnect
        </button>
      </div>
    );
  }

  return (
    <button
      onClick={handleConnect}
      class="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors flex items-center gap-2"
    >
      <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
        <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
      </svg>
      Connect X
    </button>
  );
} 