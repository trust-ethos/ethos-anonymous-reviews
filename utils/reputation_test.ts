import { assertEquals } from "$std/assert/mod.ts";
import { getReviewerReputation, MIN_SCORE } from "./reputation.ts";

type FetchStub = (
  input: RequestInfo | URL,
  init?: RequestInit,
) => Promise<Response>;

async function withFetch<T>(stub: FetchStub, fn: () => Promise<T>): Promise<T> {
  const original = globalThis.fetch;
  globalThis.fetch = stub as typeof fetch;
  try {
    return await fn();
  } finally {
    globalThis.fetch = original;
  }
}

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

Deno.test("MIN_SCORE is 1600", () => {
  assertEquals(MIN_SCORE, 1600);
});

Deno.test("score 1599 is rejected", async () => {
  const result = await withFetch(
    () => Promise.resolve(jsonResponse([{ score: 1599 }])),
    () => getReviewerReputation("123"),
  );
  assertEquals(result.ok, false);
});

Deno.test("score 1600 is reputable", async () => {
  const result = await withFetch(
    () => Promise.resolve(jsonResponse([{ score: 1600 }])),
    () => getReviewerReputation("123"),
  );
  assertEquals(result, { ok: true, score: 1600, level: "reputable" });
});

Deno.test("score 2000 is exemplary", async () => {
  const result = await withFetch(
    () => Promise.resolve(jsonResponse([{ score: 2000 }])),
    () => getReviewerReputation("123"),
  );
  assertEquals(result, { ok: true, score: 2000, level: "exemplary" });
});

Deno.test("empty array is rejected", async () => {
  const result = await withFetch(
    () => Promise.resolve(jsonResponse([])),
    () => getReviewerReputation("123"),
  );
  assertEquals(result.ok, false);
});

Deno.test("missing or non-numeric score is rejected", async () => {
  const missing = await withFetch(
    () => Promise.resolve(jsonResponse([{ username: "x" }])),
    () => getReviewerReputation("123"),
  );
  assertEquals(missing.ok, false);

  const text = await withFetch(
    () => Promise.resolve(jsonResponse([{ score: "9999" }])),
    () => getReviewerReputation("123"),
  );
  assertEquals(text.ok, false);
});

Deno.test("HTTP 500 is rejected", async () => {
  const result = await withFetch(
    () => Promise.resolve(jsonResponse({ error: "boom" }, 500)),
    () => getReviewerReputation("123"),
  );
  assertEquals(result.ok, false);
});

Deno.test("thrown fetch is rejected", async () => {
  const result = await withFetch(
    () => Promise.reject(new TypeError("network down")),
    () => getReviewerReputation("123"),
  );
  assertEquals(result.ok, false);
});

Deno.test("request body uses the X id passed in", async () => {
  let seenUrl = "";
  let seenBody = "";
  let seenMethod = "";
  await withFetch(
    (input, init) => {
      seenUrl = String(input);
      seenMethod = init?.method ?? "";
      seenBody = String(init?.body ?? "");
      return Promise.resolve(jsonResponse([{ score: 1700 }]));
    },
    () => getReviewerReputation("44196397"),
  );
  assertEquals(seenUrl, "https://api.ethos.network/api/v2/users/by/x");
  assertEquals(seenMethod, "POST");
  assertEquals(JSON.parse(seenBody), { accountIdsOrUsernames: ["44196397"] });
});
