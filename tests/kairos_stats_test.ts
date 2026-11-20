// Guards the page's promise to keep no record of who visits: the KairosAgent
// avatar must come from this app, never from a third party (the Ethos API's
// own avatarUrl is a pbs.twimg.com URL, which would hand every visitor's IP
// and user agent to Twitter's CDN).
import { assert } from "$std/assert/mod.ts";
import type { FreshContext } from "$fresh/server.ts";
import { handler } from "../routes/api/kairos-stats.ts";

/** Calls GET /api/kairos-stats with the server's fetch replaced by `stub`. */
async function avatarUrlWith(stub: typeof fetch): Promise<string> {
  const realFetch = globalThis.fetch;
  globalThis.fetch = stub;
  try {
    const response = await handler.GET!(
      new Request("http://localhost/api/kairos-stats"),
      {} as FreshContext,
    );
    return (await response.json()).avatarUrl;
  } finally {
    globalThis.fetch = realFetch;
  }
}

/** A path on this app: starts with one "/", so not "//other.host/x" either. */
function assertSameOrigin(avatarUrl: string) {
  assert(
    avatarUrl.startsWith("/") && !avatarUrl.startsWith("//"),
    `avatarUrl must be a path on this app, got ${avatarUrl}`,
  );
}

Deno.test("kairos-stats serves its own avatar when the Ethos API is unreachable", async () => {
  assertSameOrigin(
    await avatarUrlWith(() => Promise.reject(new Error("network down"))),
  );
});

Deno.test("kairos-stats serves its own avatar when the Ethos API answers with an error", async () => {
  assertSameOrigin(
    await avatarUrlWith(() =>
      Promise.resolve(new Response("nope", { status: 500 }))
    ),
  );
});

Deno.test("kairos-stats ignores the twimg avatar in the Ethos API's profile", async () => {
  const profile = {
    displayName: "Kairos Agent",
    username: "kairosAgent",
    avatarUrl:
      "https://pbs.twimg.com/profile_images/1934789365391138816/pwKwh4aN.jpg",
    score: 1273,
    stats: {
      review: { received: { negative: 5, neutral: 7, positive: 54 } },
      vouch: { received: { amountWeiTotal: "0", count: 0 } },
    },
  };
  assertSameOrigin(
    await avatarUrlWith(() => Promise.resolve(Response.json([profile]))),
  );
});
