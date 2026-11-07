// Server-side reputation gate for review and slash submissions.
// The only place the 1600 threshold should live on the server.

export const MIN_SCORE = 1600;
export const EXEMPLARY_SCORE = 2000;

const ETHOS_USERS_BY_X_URL = "https://api.ethos.network/api/v2/users/by/x";
const REQUEST_TIMEOUT_MS = 5000;

export type ReputationLevel = "reputable" | "exemplary";

export type ReviewerReputation =
  | { ok: true; score: number; level: ReputationLevel }
  | { ok: false; reason: string };

export function levelForScore(score: number): ReputationLevel | null {
  if (score >= EXEMPLARY_SCORE) return "exemplary";
  if (score >= MIN_SCORE) return "reputable";
  return null;
}

// Looks up the reviewer's Ethos score by X user id (never by username, so a
// rename cannot point at another profile) and fails closed on any problem.
export async function getReviewerReputation(
  xUserId: string,
): Promise<ReviewerReputation> {
  if (!xUserId) {
    return { ok: false, reason: "Missing reviewer id" };
  }

  let response: Response;
  try {
    response = await fetch(ETHOS_USERS_BY_X_URL, {
      method: "POST",
      headers: {
        "accept": "application/json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ accountIdsOrUsernames: [xUserId] }),
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return { ok: false, reason: `Reputation lookup failed: ${message}` };
  }

  if (!response.ok) {
    return {
      ok: false,
      reason: `Reputation lookup returned HTTP ${response.status}`,
    };
  }

  let data: unknown;
  try {
    data = await response.json();
  } catch {
    return { ok: false, reason: "Reputation lookup returned invalid JSON" };
  }

  if (!Array.isArray(data) || data.length === 0) {
    return { ok: false, reason: "No Ethos profile found" };
  }

  const score = (data[0] as { score?: unknown })?.score;
  if (typeof score !== "number" || !Number.isFinite(score)) {
    return { ok: false, reason: "Ethos profile has no score" };
  }

  const level = levelForScore(score);
  if (!level) {
    return { ok: false, reason: `Score ${score} is below ${MIN_SCORE}` };
  }

  return { ok: true, score, level };
}
