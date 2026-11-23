// Session cookies and transport: the sign-in cookies carry Secure whenever the
// request came over HTTPS (and not on local http://, where a Secure cookie
// would never come back), the signed session no longer holds the X access
// token, and every response tells the browser to use HTTPS only (HSTS).
//
// Runs under a bare `deno test` with no permissions: the environment and the
// two calls to the X API are replaced for the length of a test.
import { assert, assertEquals, assertFalse } from "$std/assert/mod.ts";
import { handler as middleware } from "../routes/_middleware.ts";
import { verifySecureSession } from "../utils/security.ts";

type Get = (req: Request) => Response | Promise<Response>;

const ACCESS_TOKEN = "test-access-token-do-not-store";

/** A fresh random secret; never a fixed one. */
function randomSecret(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(48));
  return Array.from(bytes, (b) => (b % 36).toString(36)).join("");
}

/** Runs `fn` with a strong SESSION_SECRET, a stubbed X API and quiet logs. */
async function withSignIn<T>(fn: () => Promise<T>): Promise<T> {
  const realGet = Deno.env.get;
  const realFetch = globalThis.fetch;
  const realLog = console.log;
  const secret = randomSecret();

  Deno.env.get = (key: string) => key === "SESSION_SECRET" ? secret : undefined;
  globalThis.fetch = (input: string | URL | Request) => {
    const url = input instanceof Request ? input.url : String(input);
    const body = url.includes("/oauth2/token")
      ? { access_token: ACCESS_TOKEN, expires_in: 7200 }
      : {
        data: { id: "1234567890", name: "Test User", username: "test_user" },
      };
    return Promise.resolve(Response.json(body));
  };
  console.log = () => {};

  try {
    return await fn();
  } finally {
    Deno.env.get = realGet;
    globalThis.fetch = realFetch;
    console.log = realLog;
  }
}

/** The attributes of one Set-Cookie header, e.g. ["HttpOnly", "Secure"]. */
function attributes(cookie: string): string[] {
  return cookie.split(";").slice(1).map((part) => part.trim());
}

function cookieNamed(response: Response, name: string): string {
  const cookie = response.headers.getSetCookie().find((c) =>
    c.startsWith(`${name}=`)
  );
  assert(cookie, `${name} cookie is set`);
  return cookie;
}

async function startSignIn(origin: string): Promise<Response> {
  const { handler } = await import("../routes/auth/twitter.ts");
  return await (handler as { GET: Get }).GET(
    new Request(`${origin}/auth/twitter`),
  );
}

async function finishSignIn(origin: string): Promise<Response> {
  const { handler } = await import("../routes/auth/twitter/callback.ts");
  return await (handler as { GET: Get }).GET(
    new Request(`${origin}/auth/twitter/callback?code=test-code&state=abc`, {
      headers: { cookie: "twitter_oauth_state=abc" },
    }),
  );
}

Deno.test("the OAuth state cookie is Secure on an https request", async () => {
  await withSignIn(async () => {
    const response = await startSignIn("https://anon.ethos.network");
    assertEquals(response.status, 302);

    const flags = attributes(cookieNamed(response, "twitter_oauth_state"));
    assert(flags.includes("Secure"), "Secure is set over https");
    assert(flags.includes("HttpOnly"), "HttpOnly is kept");
    assert(flags.includes("SameSite=Lax"), "SameSite is kept");
  });
});

Deno.test("the OAuth state cookie is not Secure on an http request", async () => {
  await withSignIn(async () => {
    const response = await startSignIn("http://localhost:8000");
    assertEquals(response.status, 302);

    const flags = attributes(cookieNamed(response, "twitter_oauth_state"));
    assertFalse(flags.includes("Secure"), "local http sign-in still works");
    assert(flags.includes("HttpOnly"), "HttpOnly is kept");
    assert(flags.includes("SameSite=Lax"), "SameSite is kept");
  });
});

Deno.test("the session cookie is Secure on an https request", async () => {
  await withSignIn(async () => {
    const response = await finishSignIn("https://anon.ethos.network");
    assertEquals(response.status, 302);

    for (const name of ["twitter_session", "twitter_oauth_state"]) {
      const flags = attributes(cookieNamed(response, name));
      assert(flags.includes("Secure"), `${name}: Secure is set over https`);
      assert(flags.includes("HttpOnly"), `${name}: HttpOnly is kept`);
      assert(flags.includes("SameSite=Lax"), `${name}: SameSite is kept`);
    }
  });
});

Deno.test("the session cookie is not Secure on an http request", async () => {
  await withSignIn(async () => {
    const response = await finishSignIn("http://localhost:8000");
    assertEquals(response.status, 302);

    for (const name of ["twitter_session", "twitter_oauth_state"]) {
      const flags = attributes(cookieNamed(response, name));
      assertFalse(flags.includes("Secure"), `${name}: no Secure over http`);
      assert(flags.includes("HttpOnly"), `${name}: HttpOnly is kept`);
      assert(flags.includes("SameSite=Lax"), `${name}: SameSite is kept`);
    }
  });
});

Deno.test("the session does not hold the X access token", async () => {
  await withSignIn(async () => {
    const response = await finishSignIn("https://anon.ethos.network");
    const value = cookieNamed(response, "twitter_session")
      .split(";")[0].slice("twitter_session=".length);

    // What the browser holds: the cookie is base64 JSON, readable by anyone.
    const stored = atob(value);
    assertFalse(
      stored.includes(ACCESS_TOKEN),
      "the token is not in the cookie",
    );
    assertFalse("accessToken" in JSON.parse(stored), "no accessToken field");

    // What the app reads back: still a valid session for the same user.
    const session = await verifySecureSession(value);
    assert(session, "the session verifies");
    assertEquals(session.user.username, "test_user");
    assertFalse("accessToken" in session, "no accessToken on the session");
    assertEquals(
      Object.keys(session).sort(),
      ["expiresAt", "nonce", "signature", "user"],
    );
  });
});

Deno.test("the middleware adds the HSTS header to every response", async () => {
  const request = new Request("https://anon.ethos.network/");
  const responses = [
    new Response("<h1>page</h1>", { headers: { "content-type": "text/html" } }),
    Response.json({ authenticated: false }, { status: 401 }),
    new Response(null, { status: 302, headers: { Location: "/" } }),
    new Response("Not found", { status: 404 }),
    // Headers that cannot be changed in place: the response is copied.
    Response.redirect("https://anon.ethos.network/", 307),
  ];

  for (const inner of responses) {
    const response = await middleware(request, {
      next: () => Promise.resolve(inner),
    });
    assertEquals(
      response.headers.get("strict-transport-security"),
      "max-age=31536000",
    );
    assertEquals(response.status, inner.status, "the status is kept");
    assertEquals(
      response.headers.get("location"),
      inner.headers.get("location"),
      "other headers are kept",
    );
  }
});
