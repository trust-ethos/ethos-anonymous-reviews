// When SESSION_SECRET is missing or weak, the X sign-in callback must answer
// with a plain "sign-in is unavailable" 500: no session cookie, no reason and
// no stack on the page.
//
// Runs under a bare `deno test` with no permissions: the environment and the
// two calls to the X API are replaced for the length of the test.
import { assert, assertEquals, assertFalse } from "$std/assert/mod.ts";

type Get = (req: Request) => Response | Promise<Response>;

Deno.test("the sign-in callback answers 500 with a plain message when SESSION_SECRET is unset", async () => {
  const realGet = Deno.env.get;
  const realFetch = globalThis.fetch;
  const realError = console.error;
  const logged: string[] = [];

  Deno.env.get = () => undefined; // nothing is set, SESSION_SECRET included
  globalThis.fetch = (input: string | URL | Request) => {
    const url = input instanceof Request ? input.url : String(input);
    const body = url.includes("/oauth2/token")
      ? { access_token: "test-access-token", expires_in: 7200 }
      : {
        data: { id: "1234567890", name: "Test User", username: "test_user" },
      };
    return Promise.resolve(Response.json(body));
  };
  console.error = (...args: unknown[]) => {
    logged.push(args.map(String).join(" "));
  };

  try {
    const { handler } = await import("../routes/auth/twitter/callback.ts");
    const get = (handler as { GET: Get }).GET;

    const response = await get(
      new Request(
        "http://localhost:8000/auth/twitter/callback?code=test-code&state=abc",
        { headers: { cookie: "twitter_oauth_state=abc" } },
      ),
    );
    const body = await response.text();

    assertEquals(response.status, 500);
    assertEquals(
      body,
      "Sign-in is unavailable right now. Please try again later.",
    );
    assertFalse(response.headers.has("set-cookie"), "no session is issued");
    assertFalse(/SESSION_SECRET|Error|\bat \S+:\d+/.test(body));
    assert(
      logged.some((line) =>
        line.includes("SESSION_SECRET is not set or is too weak")
      ),
      "the reason goes to the log instead",
    );
  } finally {
    Deno.env.get = realGet;
    globalThis.fetch = realFetch;
    console.error = realError;
  }
});
