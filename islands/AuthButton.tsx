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
        // Try to load Privy from ESM
        const module = await import("https://esm.sh/@privy-io/react-auth@1.88.4");
        
        // Set up a way to access Privy state
        const checkPrivyState = () => {
          if (!mounted) return;
          
          try {
            // Try to get Privy from window/global context
            const privyInstance = (globalThis as any)?._privy;
            if (privyInstance) {
              setPrivyState({
                user: privyInstance.user,
                authenticated: privyInstance.authenticated,
                login: privyInstance.login,
                logout: privyInstance.logout,
                ready: true
              });
            }
          } catch (error) {
            // Silently handle
          }
        };

        // Check periodically for Privy state
        const interval = setInterval(checkPrivyState, 500);
        checkPrivyState();

        return () => {
          clearInterval(interval);
        };
      } catch (error) {
        console.log("Privy not available");
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
        alert("Connecting with Twitter via Privy...");
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