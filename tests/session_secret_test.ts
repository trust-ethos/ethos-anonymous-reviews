// Session signing must fail closed: without a strong SESSION_SECRET the app
// may neither sign a session nor accept one, least of all one signed with the
// placeholder that utils/security.ts used to fall back to.
//
// Runs under a bare `deno test` with no permissions: SESSION_SECRET is
// supplied by replacing Deno.env.get for the length of a test. That the
// replacement is seen at all also proves the secret is read at call time,
// since utils/security.ts is imported before any of these values exist.
import {
  assert,
  assertEquals,
  assertNotEquals,
  assertRejects,
} from "$std/assert/mod.ts";
import {
  createSecureSession,
  type SecureSession,
  verifySecureSession,
} from "../utils/security.ts";

const FALLBACK_LITERAL = "your-super-secret-key-change-this";
const SECRET_ERROR = "SESSION_SECRET is not set or is too weak";
const encoder = new TextEncoder();

/** A fresh random secret of exactly `length` characters; never a fixed one. */
function randomSecret(length: number): string {
  const bytes = crypto.getRandomValues(new Uint8Array(length));
  return Array.from(bytes, (b) => (b % 36).toString(36)).join("");
}

/** Runs `fn` with SESSION_SECRET set to `value` (undefined: not set). */
async function withSessionSecret<T>(
  value: string | undefined,
  fn: () => Promise<T>,
): Promise<T> {
  const realGet = Deno.env.get;
  Deno.env.get = (key: string) => key === "SESSION_SECRET" ? value : undefined;
  try {
    return await fn();
  } finally {
    Deno.env.get = realGet;
  }
}

/** Collects what console.error prints while `fn` runs. */
async function captureErrors(fn: () => Promise<unknown>): Promise<string[]> {
  const realError = console.error;
  const lines: string[] = [];
  console.error = (...args: unknown[]) => {
    lines.push(args.map(String).join(" "));
  };
  try {
    await fn();
  } finally {
    console.error = realError;
  }
  return lines;
}

function sessionData(): Omit<SecureSession, "nonce" | "signature"> {
  return {
    user: { id: "1234567890", name: "Tëst Üser", username: "test_user" },
    accessToken: "test-access-token",
    expiresAt: Date.now() + 60_000,
  };
}

/** Signs a session the way the app does, with a key of the caller's choice. */
async function forgeSession(key: string): Promise<string> {
  const unsigned = { ...sessionData(), nonce: crypto.randomUUID() };
  const hmacKey = await crypto.subtle.importKey(
    "raw",
    encoder.encode(key),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const mac = await crypto.subtle.sign(
    "HMAC",
    hmacKey,
    encoder.encode(JSON.stringify(unsigned)),
  );
  const signature = Array.from(new Uint8Array(mac))
    .map((b) => b.toString(16).padStart(2, "0")).join("");
  return encodeCookie({ ...unsigned, signature });
}

function encodeCookie(session: unknown): string {
  const bytes = encoder.encode(JSON.stringify(session));
  return btoa(String.fromCharCode(...bytes));
}

function decodeCookie(cookie: string): SecureSession {
  const bytes = Uint8Array.from(atob(cookie), (c) => c.charCodeAt(0));
  return JSON.parse(new TextDecoder().decode(bytes));
}

Deno.test("a session signed with the old fallback literal is rejected when SESSION_SECRET is unset", async () => {
  const forged = await forgeSession(FALLBACK_LITERAL);

  let session: SecureSession | null | undefined;
  const logged = await captureErrors(async () => {
    session = await withSessionSecret(
      undefined,
      () => verifySecureSession(forged),
    );
  });

  assertEquals(session, null);
  assertEquals(logged.length, 1, "exactly one line is logged");
  assert(logged[0].includes(SECRET_ERROR));
});

Deno.test("the fallback literal is refused even when it is set as SESSION_SECRET", async () => {
  const forged = await forgeSession(FALLBACK_LITERAL);

  await withSessionSecret(FALLBACK_LITERAL, async () => {
    const logged = await captureErrors(async () => {
      assertEquals(await verifySecureSession(forged), null);
    });
    assertEquals(logged.length, 1);
    await assertRejects(
      () => createSecureSession(sessionData()),
      Error,
      SECRET_ERROR,
    );
  });
});

Deno.test("createSecureSession throws when SESSION_SECRET is unset", async () => {
  await withSessionSecret(undefined, async () => {
    await assertRejects(
      () => createSecureSession(sessionData()),
      Error,
      SECRET_ERROR,
    );
  });
});

Deno.test("createSecureSession throws when SESSION_SECRET is shorter than 32 characters", async () => {
  for (const short of ["", "short", randomSecret(31)]) {
    await withSessionSecret(short, async () => {
      await assertRejects(
        () => createSecureSession(sessionData()),
        Error,
        SECRET_ERROR,
      );
    });
  }
});

Deno.test("with a good 48-character secret a session round-trips", async () => {
  const secret = randomSecret(48);
  assertEquals(secret.length, 48);
  const data = sessionData();

  await withSessionSecret(secret, async () => {
    const cookie = await createSecureSession(data);
    const session = await verifySecureSession(cookie);

    assert(session, "the session verifies");
    assertEquals(session.user, data.user);
    assertEquals(session.accessToken, data.accessToken);
    assertEquals(session.expiresAt, data.expiresAt);

    // The forging helper above signs the same way the app does, so the
    // rejections in the other tests are down to the key, not the format.
    assert(await verifySecureSession(await forgeSession(secret)));
  });
});

Deno.test("with a good secret a tampered signature is rejected", async () => {
  await withSessionSecret(randomSecret(48), async () => {
    const cookie = await createSecureSession(sessionData());
    const session = decodeCookie(cookie);

    const flipped = session.signature[0] === "0" ? "1" : "0";
    const badSignature = flipped + session.signature.slice(1);
    assertNotEquals(badSignature, session.signature);

    const tampered = [
      { ...session, signature: badSignature },
      { ...session, signature: session.signature.slice(0, -2) },
      { ...session, signature: session.signature.toUpperCase() + "zz" },
      { ...session, signature: "" },
      { ...session, signature: undefined },
      // A valid signature over different data: another account's id.
      { ...session, user: { ...session.user, id: "999" } },
    ];
    for (const candidate of tampered) {
      assertEquals(await verifySecureSession(encodeCookie(candidate)), null);
    }

    // A session signed with any other key is rejected too.
    assertEquals(
      await verifySecureSession(await forgeSession(randomSecret(48))),
      null,
    );
    assertEquals(
      await verifySecureSession(await forgeSession(FALLBACK_LITERAL)),
      null,
    );
  });
});
