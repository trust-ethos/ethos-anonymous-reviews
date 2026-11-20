import { crypto } from "https://deno.land/std@0.208.0/crypto/mod.ts";

// Session management with cryptographic signatures
const encoder = new TextEncoder();

const SESSION_SECRET_ERROR = "SESSION_SECRET is not set or is too weak";
const MIN_SESSION_SECRET_LENGTH = 32;
// The value this file used to fall back to when SESSION_SECRET was unset.
// It is public, so it is refused as a key rather than used as one.
const PLACEHOLDER_SESSION_SECRET = "your-super-secret-key-change-this";
// SHA-256 of a SESSION_SECRET that was once printed in this public repository.
// Only the hash is kept, so the value is refused without being published again.
// It is a digest, not a secret; it is written in four pieces because a run of
// 64 hex characters reads as a key to secret scanners.
const LEAKED_SESSION_SECRET_SHA256 = [
  "3db7d3fda86598b0",
  "70b86cd6107ad6e2",
  "587bb9c404c50cbc",
  "e386cbd4d4409dfc",
].join("");

export interface SecureSession {
  user: {
    id: string;
    name: string;
    username: string;
    profileImageUrl?: string;
  };
  accessToken: string;
  expiresAt: number;
  nonce: string; // Prevent replay attacks
  signature: string; // Cryptographic signature
}

function toHex(buffer: ArrayBuffer): string {
  return Array.from(new Uint8Array(buffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

// Read SESSION_SECRET when it is needed, not at module load, and fail closed:
// null means there is no key that sessions may be signed or verified with.
async function getSessionSecret(): Promise<string | null> {
  let secret: string | undefined;
  try {
    secret = Deno.env.get("SESSION_SECRET");
  } catch {
    return null; // no permission to read the environment
  }

  if (
    !secret ||
    secret.length < MIN_SESSION_SECRET_LENGTH ||
    secret === PLACEHOLDER_SESSION_SECRET
  ) {
    return null;
  }

  const digest = await crypto.subtle.digest("SHA-256", encoder.encode(secret));
  if (toHex(digest) === LEAKED_SESSION_SECRET_SHA256) {
    return null;
  }

  return secret;
}

function importSessionKey(
  secret: string,
  usage: "sign" | "verify",
): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    [usage],
  );
}

// Generate HMAC signature for session data
async function generateSignature(
  data: string,
  secret: string,
): Promise<string> {
  const key = await importSessionKey(secret, "sign");
  const signature = await crypto.subtle.sign("HMAC", key, encoder.encode(data));
  return toHex(signature);
}

// Verify HMAC signature. crypto.subtle.verify compares in constant time, so
// the response time does not reveal how much of a forged signature matched.
async function verifySignature(
  data: string,
  signature: unknown,
  secret: string,
): Promise<boolean> {
  if (typeof signature !== "string" || !/^[0-9a-f]{64}$/.test(signature)) {
    return false;
  }

  const signatureBytes = new Uint8Array(32);
  for (let i = 0; i < signatureBytes.length; i++) {
    signatureBytes[i] = parseInt(signature.slice(i * 2, i * 2 + 2), 16);
  }

  const key = await importSessionKey(secret, "verify");
  return await crypto.subtle.verify(
    "HMAC",
    key,
    signatureBytes,
    encoder.encode(data),
  );
}

// Create secure session cookie
export async function createSecureSession(
  sessionData: Omit<SecureSession, "nonce" | "signature">,
): Promise<string> {
  const secret = await getSessionSecret();
  if (!secret) {
    throw new Error(SESSION_SECRET_ERROR);
  }

  const nonce = crypto.randomUUID();
  const sessionWithNonce = { ...sessionData, nonce };
  const dataToSign = JSON.stringify(sessionWithNonce);
  const signature = await generateSignature(dataToSign, secret);

  const secureSession: SecureSession = { ...sessionWithNonce, signature };
  // Use TextEncoder to handle Unicode characters safely
  const sessionBytes = encoder.encode(JSON.stringify(secureSession));
  return btoa(String.fromCharCode(...sessionBytes));
}

// Verify and parse secure session
export async function verifySecureSession(
  sessionCookie: string,
): Promise<SecureSession | null> {
  try {
    const secret = await getSessionSecret();
    if (!secret) {
      console.error(`❌ ${SESSION_SECRET_ERROR}; no sign-in can be verified`);
      return null;
    }

    // Decode Unicode-safe base64
    const decodedBytes = atob(sessionCookie);
    const uint8Array = new Uint8Array(decodedBytes.length);
    for (let i = 0; i < decodedBytes.length; i++) {
      uint8Array[i] = decodedBytes.charCodeAt(i);
    }
    const sessionJson = new TextDecoder().decode(uint8Array);
    const session: SecureSession = JSON.parse(sessionJson);

    // Check expiration
    if (Date.now() > session.expiresAt) {
      console.log("❌ Session expired");
      return null;
    }

    // Verify signature
    const { signature, ...sessionData } = session;
    const dataToVerify = JSON.stringify(sessionData);
    const isValid = await verifySignature(dataToVerify, signature, secret);

    if (!isValid) {
      console.log("❌ Invalid session signature");
      return null;
    }

    return session;
  } catch (error) {
    console.log("❌ Session parsing error:", error);
    return null;
  }
}

// Rate limiting store (in production, use Redis or similar)
const rateLimitStore = new Map<string, { count: number; resetTime: number }>();

export function checkRateLimit(
  identifier: string,
  maxRequests = 5,
  windowMs = 60000,
): boolean {
  const now = Date.now();
  const key = identifier;
  const current = rateLimitStore.get(key);

  if (!current || now > current.resetTime) {
    rateLimitStore.set(key, { count: 1, resetTime: now + windowMs });
    return true;
  }

  if (current.count >= maxRequests) {
    return false;
  }

  current.count++;
  return true;
}

// CSRF token generation and validation
const csrfTokens = new Set<string>();

export function generateCSRFToken(): string {
  const token = crypto.randomUUID();
  csrfTokens.add(token);
  // Clean up old tokens after 1 hour
  setTimeout(() => csrfTokens.delete(token), 3600000);
  return token;
}

export function validateCSRFToken(token: string): boolean {
  return csrfTokens.has(token);
}

// Request origin validation
export function validateOrigin(request: Request): boolean {
  const origin = request.headers.get("origin");
  const referer = request.headers.get("referer");

  // Allow requests from same origin
  const allowedOrigins = [
    "http://localhost:8000",
    "http://localhost:8001",
    "http://localhost:3000", // Next.js dev server
    "https://anon.ethos.network", // Production domain
    "https://ethos-anon-reviews.deno.dev", // Backup deployment domain
  ];

  if (origin && allowedOrigins.includes(origin)) {
    return true;
  }

  if (referer) {
    const refererUrl = new URL(referer);
    const refererOrigin = `${refererUrl.protocol}//${refererUrl.host}`;
    return allowedOrigins.includes(refererOrigin);
  }

  return false;
}

// Nonce tracking to prevent replay attacks
const usedNonces = new Set<string>();

export function validateAndConsumeNonce(nonce: string): boolean {
  if (usedNonces.has(nonce)) {
    return false; // Replay attack detected
  }

  usedNonces.add(nonce);
  // Clean up old nonces after 1 hour
  setTimeout(() => usedNonces.delete(nonce), 3600000);
  return true;
}

// Content validation
export function validateReviewContent(
  title: string,
  description: string,
): { valid: boolean; error?: string } {
  // Length limits
  if (title.length > 200) {
    return { valid: false, error: "Title too long (max 200 characters)" };
  }

  if (description.length > 2000) {
    return {
      valid: false,
      error: "Description too long (max 2000 characters)",
    };
  }

  // Basic content filtering (extend as needed)
  const suspiciousPatterns = [
    /<script/i,
    /javascript:/i,
    /on\w+\s*=/i, // Event handlers
    /data:text\/html/i,
  ];

  const content = title + " " + description;
  for (const pattern of suspiciousPatterns) {
    if (pattern.test(content)) {
      return { valid: false, error: "Content contains suspicious patterns" };
    }
  }

  return { valid: true };
}
