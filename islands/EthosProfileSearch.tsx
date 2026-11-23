import { useSignal } from "@preact/signals";
import { Signal } from "@preact/signals";
import { useEffect } from "preact/hooks";

interface EthosProfile {
  id: number;
  profileId: number;
  displayName: string;
  username: string;
  avatarUrl?: string;
  score: number;
  description?: string;
}

interface EthosProfileSearchProps {
  selectedProfile: Signal<EthosProfile | null>;
  onProfileSelect: (profile: EthosProfile) => void;
}

export default function EthosProfileSearch({ selectedProfile, onProfileSelect }: EthosProfileSearchProps) {
  const searchQuery = useSignal("");
  const searchResults = useSignal<EthosProfile[]>([]);
  const isSearching = useSignal(false);
  const showResults = useSignal(false);
  const debounceTimeout = useSignal<ReturnType<typeof setTimeout> | null>(null);

  const searchProfiles = async (query: string) => {
    if (!query.trim()) {
      searchResults.value = [];
      showResults.value = false;
      return;
    }

    isSearching.value = true;
    try {
      const response = await fetch(
        `https://api.ethos.network/api/v2/users/search?query=${encodeURIComponent(query)}&userKeyType=TWITTER&limit=10&offset=0`
      );
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      const profiles = data.values || [];
      
      searchResults.value = profiles.map((profile: any) => ({
        id: profile.id,
        profileId: profile.profileId,
        displayName: profile.displayName,
        username: profile.username,
        avatarUrl: profile.avatarUrl,
        score: profile.score || 0,
        description: profile.description,
      }));
      
      showResults.value = true;
    } catch (error) {
      console.error("Error searching profiles:", error);
      searchResults.value = [];
      showResults.value = false;
    } finally {
      isSearching.value = false;
    }
  };

  const debouncedSearch = (query: string) => {
    // Clear existing timeout
    if (debounceTimeout.value) {
      clearTimeout(debounceTimeout.value);
    }

    // If query is empty, clear results immediately
    if (!query.trim()) {
      searchResults.value = [];
      showResults.value = false;
      isSearching.value = false;
      return;
    }

    // Set new timeout for 300ms delay
    debounceTimeout.value = setTimeout(() => {
      searchProfiles(query);
    }, 300);
  };

  const handleInputChange = (e: Event) => {
    const target = e.target as HTMLInputElement;
    searchQuery.value = target.value;
    debouncedSearch(target.value);
  };

  const handleProfileSelect = (profile: EthosProfile) => {
    onProfileSelect(profile);
    searchQuery.value = "";
    searchResults.value = [];
    showResults.value = false;
    
    // Clear any pending search
    if (debounceTimeout.value) {
      clearTimeout(debounceTimeout.value);
      debounceTimeout.value = null;
    }
  };

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (debounceTimeout.value) {
        clearTimeout(debounceTimeout.value);
      }
    };
  }, []);

  // The level colour for a score, as a design system token (used as an inline `color`).
  const getScoreColor = (score: number) => {
    if (score < 800) return "var(--ethos-level-untrusted)";
    if (score < 1200) return "var(--ethos-level-questionable)";
    if (score < 1600) return "var(--ethos-level-neutral)";
    if (score < 2000) return "var(--ethos-level-reputable)";
    if (score < 2400) return "var(--ethos-level-exemplary)";
    return "var(--ethos-level-revered)";
  };

  const getScoreLabel = (score: number) => {
    if (score < 800) return "Untrusted";
    if (score < 1200) return "Questionable";
    if (score < 1600) return "Neutral";
    if (score < 2000) return "Reputable";
    if (score < 2400) return "Exemplary";
    return "Revered";
  };

  return (
    <div class="relative">
      {/* Selected Profile Display */}
      {selectedProfile?.value && (
        <div class="e-surface mb-4">
          <div class="flex items-center justify-between gap-3">
            <div class="flex items-center gap-3 min-w-0">
              <div class="e-avatar">
                {selectedProfile?.value?.avatarUrl ? (
                  <img 
                    src={selectedProfile?.value?.avatarUrl} 
                    alt={selectedProfile?.value?.username}
                  />
                ) : (
                  <span class="ph">
                    {selectedProfile?.value?.username?.charAt(0).toUpperCase()}
                  </span>
                )}
              </div>
              <div class="min-w-0">
                <div class="e-text md sans truncate">{selectedProfile?.value?.displayName || `@${selectedProfile?.value?.username}`}</div>
                <div class="e-text sm muted truncate">@{selectedProfile?.value?.username}</div>
                <div class="e-text sm" style={{ color: getScoreColor(selectedProfile?.value?.score || 0) }}>
                  {selectedProfile?.value?.score} - {getScoreLabel(selectedProfile?.value?.score || 0)}
                </div>
              </div>
            </div>
            <button
              type="button"
              onClick={() => selectedProfile && (selectedProfile.value = null)}
              class="e-btn text icon"
              aria-label="Remove selected profile"
            >
              <span class="ei ei-close" aria-hidden="true"></span>
            </button>
          </div>
        </div>
      )}

      {/* Search Input */}
      {!selectedProfile?.value && (
        <div class="relative">
          {/* The form sits in an e-card, so the field takes the base surface to stand apart from it */}
          <div class="e-input" style="background: var(--ethos-bg-base)">
            <span class="affix">
              <span class="ei ei-m-search-outlined" aria-hidden="true"></span>
            </span>
            <input
              type="text"
              value={searchQuery.value}
              onInput={handleInputChange}
              placeholder="Search for X accounts..."
            />
            {isSearching.value && (
              <span class="affix">
                <span class="ei ei-a-loading-outlined animate-spin" aria-hidden="true"></span>
              </span>
            )}
          </div>

          {/* Search Results */}
          {showResults.value && searchResults.value.length > 0 && (
            <div
              class="e-elevated e-menu absolute z-10 w-full mt-1 p-1 max-h-60 overflow-y-auto"
              style="box-shadow: var(--ethos-shadow-card)"
            >
              {searchResults.value.map((profile) => (
                <button
                  key={profile.id}
                  type="button"
                  onClick={() => handleProfileSelect(profile)}
                  class="e-menu-item w-full text-left hover:bg-[var(--ethos-bg-container)] focus:bg-[var(--ethos-bg-container)] focus:outline-none"
                >
                  <div class="e-avatar">
                    {profile.avatarUrl ? (
                      <img 
                        src={profile.avatarUrl} 
                        alt={profile.username}
                      />
                    ) : (
                      <span class="ph">
                        {profile.username.charAt(0).toUpperCase()}
                      </span>
                    )}
                  </div>
                  <div class="flex-1 min-w-0">
                    <div class="font-semibold truncate">{profile.displayName || `@${profile.username}`}</div>
                    <div class="e-text sm muted truncate">@{profile.username}</div>
                    <div class="e-text sm" style={{ color: getScoreColor(profile.score) }}>
                      {profile.score} - {getScoreLabel(profile.score)}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}

          {/* No Results */}
          {showResults.value && searchResults.value.length === 0 && searchQuery.value.trim() && !isSearching.value && (
            <div
              class="e-elevated e-text md muted absolute z-10 w-full mt-1"
              style="box-shadow: var(--ethos-shadow-card)"
            >
              No profiles found for "{searchQuery.value}"
            </div>
          )}
        </div>
      )}
    </div>
  );
} 