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
      <button class="e-btn">
        Loading...
      </button>
    );
  }

  // Show user info if authenticated
  if (user.value) {
    return (
      <div class="flex items-center gap-3 min-w-0">
        <div class="flex items-center gap-2 min-w-0">
          {/* The avatar is as tall as the button beside it, so the top bar keeps its height. */}
          <div class="e-avatar" style="--av: var(--ethos-size-control-md)">
            {user.value.profileImageUrl ? (
              <img 
                src={user.value.profileImageUrl} 
                alt={user.value.name}
              />
            ) : (
              <div class="ph e-text md">
                {user.value.username.charAt(0).toUpperCase()}
              </div>
            )}
          </div>
          <div class="e-text md sans truncate">@{user.value.username}</div>
        </div>
        <button
          onClick={handleLogout}
          class="e-btn"
        >
          Logout
        </button>
      </div>
    );
  }

  return (
    <button
      onClick={handleLogin}
      class="e-btn primary"
    >
      <span class="ei ei-twitter-x" aria-hidden="true"></span>
      Connect with X
    </button>
  );
} 