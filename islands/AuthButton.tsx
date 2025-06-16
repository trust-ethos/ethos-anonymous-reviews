import { useSignal } from "@preact/signals";
import { useEffect, useState } from "preact/hooks";

// Custom hook to safely use Privy
function usePrivySafe() {
  const [privyState, setPrivyState] = useState({
    user: null,
    authenticated: false,
    login: null,
    logout: null,
    ready: false
  });

  useEffect(() => {
    let mounted = true;
    
    const loadPrivy = async () => {
      try {
        // Use the import map reference
        const module = await import("@privy-io/react-auth");
        console.log("✅ Privy hooks loaded successfully");
        
        // Try to use Privy hooks if available
        if (module.usePrivy && module.useLogin && module.useLogout) {
          // This is a simplified approach - in a real app you'd need to handle this differently
          // For now, we'll just mark as ready and let the demo mode handle it
          setPrivyState(prev => ({ ...prev, ready: true }));
        }
      } catch (error) {
        console.log("⚠️ Privy hooks not available, using demo mode");
      }
    };

    loadPrivy();

    return () => {
      mounted = false;
    };
  }, []);

  return privyState;
}

export default function AuthButton() {
  const [isClient, setIsClient] = useState(false);
  const privyState = usePrivySafe();
  
  // Demo fallback state
  const isConnected = useSignal(false);
  const mockUser = useSignal({
    username: "demo_user",
    name: "Demo User",
    profilePictureUrl: "https://pbs.twimg.com/profile_images/1234567890/demo.jpg"
  });

  useEffect(() => {
    setIsClient(true);
  }, []);

  const handleConnect = async () => {
    if (privyState.ready && privyState.authenticated && privyState.logout) {
      // Real Privy logout
      privyState.logout();
    } else if (privyState.ready && !privyState.authenticated && privyState.login) {
      // Real Privy login
      privyState.login();
    } else {
      // Demo mode fallback
      if (isConnected.value) {
        isConnected.value = false;
      } else {
        console.log("🔗 Attempting to connect with Privy...");
        // Try to trigger Privy login if available
        try {
          const module = await import("@privy-io/react-auth");
          if (module.useLogin) {
            console.log("✅ Privy available, but login needs to be handled in provider context");
          }
        } catch (error) {
          console.log("⚠️ Privy not available, using demo mode");
        }
        
        alert("Demo mode: Connecting with Twitter via Privy...");
        isConnected.value = true;
      }
    }
  };

  if (!isClient) {
    return (
      <button class="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors">
        Connect X
      </button>
    );
  }

  // Show real user if authenticated with Privy
  if (privyState.ready && privyState.authenticated && privyState.user) {
    const twitterAccount = privyState.user.twitter;
    
    return (
      <div class="flex items-center gap-3">
        <div class="flex items-center gap-2">
          {twitterAccount?.profilePictureUrl ? (
            <img 
              src={twitterAccount.profilePictureUrl} 
              alt={twitterAccount.username}
              class="w-8 h-8 rounded-full"
            />
          ) : (
            <div class="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-white text-sm font-medium">
              {twitterAccount?.username?.charAt(0).toUpperCase() || 'U'}
            </div>
          )}
          <div class="text-sm">
            <div class="font-medium">@{twitterAccount?.username || 'Unknown'}</div>
            <div class="text-neutral-400 text-xs">{twitterAccount?.name || 'Twitter User'}</div>
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

  // Show demo user if in demo mode
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