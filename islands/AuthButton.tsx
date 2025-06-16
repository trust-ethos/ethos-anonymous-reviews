import { useSignal } from "@preact/signals";
import { useEffect } from "preact/hooks";

interface TwitterUser {
  id: string;
  name: string;
  username: string;
  profileImageUrl?: string;
}

interface TwitterSession {
  user: TwitterUser;
  accessToken: string;
  expiresAt: number;
}

export default function AuthButton() {
  const user = useSignal<TwitterUser | null>(null);
  const isLoading = useSignal(true);

  useEffect(() => {
    // Check if user is authenticated by looking for session cookie
    const checkAuth = async () => {
      try {
        const response = await fetch('/api/auth/me');
        if (response.ok) {
          const userData = await response.json();
          user.value = userData.user;
        }
      } catch (error) {
        console.log('Not authenticated');
      } finally {
        isLoading.value = false;
      }
    };

    checkAuth();
  }, []);

  const handleLogin = () => {
    // Redirect to Twitter OAuth
    window.location.href = '/auth/twitter';
  };

  const handleLogout = () => {
    // Redirect to logout endpoint
    window.location.href = '/auth/logout';
  };

  if (isLoading.value) {
    return (
      <button class="px-4 py-2 bg-neutral-700 text-neutral-300 rounded-md">
        Loading...
      </button>
    );
  }

  // Show user info if authenticated
  if (user.value) {
    return (
      <div class="flex items-center gap-3">
        <div class="flex items-center gap-2">
          {user.value.profileImageUrl ? (
            <img 
              src={user.value.profileImageUrl} 
              alt={user.value.name}
              class="w-8 h-8 rounded-full"
            />
          ) : (
            <div class="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-white text-sm font-medium">
              {user.value.username.charAt(0).toUpperCase()}
            </div>
          )}
          <div class="text-sm">
            <div class="font-medium">@{user.value.username}</div>
          </div>
        </div>
        <button
          onClick={handleLogout}
          class="px-3 py-1 text-sm bg-neutral-700 text-neutral-300 rounded hover:bg-neutral-600 transition-colors"
        >
          Logout
        </button>
      </div>
    );
  }

  return (
    <button
      onClick={handleLogin}
      class="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors flex items-center gap-2"
    >
      <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
        <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
      </svg>
      Connect with X
    </button>
  );
} 