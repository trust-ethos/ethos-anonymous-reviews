import { crypto } from "https://deno.land/std@0.208.0/crypto/mod.ts";

// Session management with cryptographic signatures
const SESSION_SECRET = Deno.env.get("SESSION_SECRET") || "your-super-secret-key-change-this";
const encoder = new TextEncoder();

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

// Generate HMAC signature for session data
async function generateSignature(data: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(SESSION_SECRET),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  
  const signature = await crypto.subtle.sign("HMAC", key, encoder.encode(data));
  return Array.from(new Uint8Array(signature))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

// Verify HMAC signature
async function verifySignature(data: string, signature: string): Promise<boolean> {
  const expectedSignature = await generateSignature(data);
  return expectedSignature === signature;
}

// Create secure session cookie
export async function createSecureSession(sessionData: Omit<SecureSession, 'nonce' | 'signature'>): Promise<string> {
  const nonce = crypto.randomUUID();
  const sessionWithNonce = { ...sessionData, nonce };
  const dataToSign = JSON.stringify(sessionWithNonce);
  const signature = await generateSignature(dataToSign);
  
  const secureSession: SecureSession = { ...sessionWithNonce, signature };
  return btoa(JSON.stringify(secureSession));
}

// Verify and parse secure session
export async function verifySecureSession(sessionCookie: string): Promise<SecureSession | null> {
  try {
    const session: SecureSession = JSON.parse(atob(sessionCookie));
    
    // Check expiration
    if (Date.now() > session.expiresAt) {
      console.log("❌ Session expired");
      return null;
    }
    
    // Verify signature
    const { signature, ...sessionData } = session;
    const dataToVerify = JSON.stringify(sessionData);
    const isValid = await verifySignature(dataToVerify, signature);
    
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

export function checkRateLimit(identifier: string, maxRequests = 5, windowMs = 60000): boolean {
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
    "https://ethos-anon-reviews.deno.dev" // Backup deployment domain
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
export function validateReviewContent(title: string, description: string): { valid: boolean; error?: string } {
  // Length limits
  if (title.length > 200) {
    return { valid: false, error: "Title too long (max 200 characters)" };
  }
  
  if (description.length > 2000) {
    return { valid: false, error: "Description too long (max 2000 characters)" };
  }
  
  // Basic content filtering (extend as needed)
  const suspiciousPatterns = [
    /<script/i,
    /javascript:/i,
    /on\w+\s*=/i, // Event handlers
    /data:text\/html/i
  ];
  
  const content = title + " " + description;
  for (const pattern of suspiciousPatterns) {
    if (pattern.test(content)) {
      return { valid: false, error: "Content contains suspicious patterns" };
    }
  }
  
  return { valid: true };
} 