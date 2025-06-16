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
  const debounceTimeout = useSignal<number | null>(null);

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

  const getScoreColor = (score: number) => {
    if (score < 800) return "text-red-400";
    if (score < 1200) return "text-yellow-400";
    if (score < 1600) return "text-neutral-400";
    if (score < 2000) return "text-blue-400";
    if (score < 2400) return "text-green-400";
    return "text-purple-400";
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
      {selectedProfile.value && (
        <div class="mb-4 p-3 bg-neutral-800 border border-neutral-700 rounded-md">
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-3">
              <div class="w-8 h-8 rounded-full bg-neutral-600 flex items-center justify-center text-sm font-medium overflow-hidden">
                {selectedProfile.value.avatarUrl ? (
                  <img 
                    src={selectedProfile.value.avatarUrl} 
                    alt={selectedProfile.value.username}
                    class="w-full h-full object-cover"
                  />
                ) : (
                  selectedProfile.value.username.charAt(0).toUpperCase()
                )}
              </div>
              <div>
                <div class="font-medium">{selectedProfile.value.displayName || `@${selectedProfile.value.username}`}</div>
                <div class="text-xs text-neutral-400">@{selectedProfile.value.username}</div>
                <div class={`text-xs ${getScoreColor(selectedProfile.value.score)}`}>
                  {selectedProfile.value.score} - {getScoreLabel(selectedProfile.value.score)}
                </div>
              </div>
            </div>
            <button
              type="button"
              onClick={() => selectedProfile.value = null}
              class="text-neutral-400 hover:text-neutral-200 text-sm"
            >
              ✕
            </button>
          </div>
        </div>
      )}

      {/* Search Input */}
      {!selectedProfile.value && (
        <div class="relative">
          <input
            type="text"
            value={searchQuery.value}
            onInput={handleInputChange}
            placeholder="Search for X accounts..."
            class="w-full px-3 py-2 bg-neutral-800 border border-neutral-700 rounded-md text-sm placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-neutral-500 focus:border-transparent"
          />
          
          {isSearching.value && (
            <div class="absolute right-3 top-1/2 transform -translate-y-1/2">
              <div class="animate-spin rounded-full h-4 w-4 border-b-2 border-neutral-400"></div>
            </div>
          )}

          {/* Search Results */}
          {showResults.value && searchResults.value.length > 0 && (
            <div class="absolute z-10 w-full mt-1 bg-neutral-800 border border-neutral-700 rounded-md shadow-lg max-h-60 overflow-y-auto">
              {searchResults.value.map((profile) => (
                <button
                  key={profile.id}
                  type="button"
                  onClick={() => handleProfileSelect(profile)}
                  class="w-full px-3 py-2 text-left hover:bg-neutral-700 focus:bg-neutral-700 focus:outline-none first:rounded-t-md last:rounded-b-md"
                >
                  <div class="flex items-center gap-3">
                    <div class="w-8 h-8 rounded-full bg-neutral-600 flex items-center justify-center text-sm font-medium overflow-hidden flex-shrink-0">
                      {profile.avatarUrl ? (
                        <img 
                          src={profile.avatarUrl} 
                          alt={profile.username}
                          class="w-full h-full object-cover"
                        />
                      ) : (
                        profile.username.charAt(0).toUpperCase()
                      )}
                    </div>
                    <div class="flex-1 min-w-0">
                      <div class="font-medium truncate">{profile.displayName || `@${profile.username}`}</div>
                      <div class="text-xs text-neutral-400 truncate">@{profile.username}</div>
                      <div class={`text-xs ${getScoreColor(profile.score)}`}>
                        {profile.score} - {getScoreLabel(profile.score)}
                      </div>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}

          {/* No Results */}
          {showResults.value && searchResults.value.length === 0 && searchQuery.value.trim() && !isSearching.value && (
            <div class="absolute z-10 w-full mt-1 bg-neutral-800 border border-neutral-700 rounded-md shadow-lg p-3 text-sm text-neutral-400">
              No profiles found for "{searchQuery.value}"
            </div>
          )}
        </div>
      )}
    </div>
  );
} 