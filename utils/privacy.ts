// Privacy-focused logging and data handling utilities
// Ensures no user identifiable information is stored or logged

export interface PrivacyConfig {
  enableLogging: boolean;
  anonymizeUserIds: boolean;
  logRetentionDays: number;
  redactSensitiveData: boolean;
}

// Privacy configuration - can be controlled via environment variables
export const PRIVACY_CONFIG: PrivacyConfig = {
  enableLogging: Deno.env.get("ENABLE_LOGGING") !== "false", // Default true, but can be disabled
  anonymizeUserIds: Deno.env.get("ANONYMIZE_USER_IDS") !== "false", // Default true
  logRetentionDays: parseInt(Deno.env.get("LOG_RETENTION_DAYS") || "0"), // Default 0 = no retention
  redactSensitiveData: Deno.env.get("REDACT_SENSITIVE_DATA") !== "false", // Default true
};

// Anonymous hash function for user IDs (one-way, deterministic)
export function anonymizeUserId(userId: string): string {
  if (!PRIVACY_CONFIG.anonymizeUserIds) {
    return userId;
  }
  
  // Create a hash that's consistent but doesn't reveal the original ID
  const encoder = new TextEncoder();
  const data = encoder.encode(userId + Deno.env.get("ANONYMIZATION_SALT") || "default_salt");
  return Array.from(data)
    .reduce((hash, byte) => ((hash << 5) - hash + byte) & 0xffffffff, 0)
    .toString(16)
    .substring(0, 8);
}

// Privacy-safe logging function
export function privacyLog(level: 'info' | 'warn' | 'error', message: string, data?: any) {
  if (!PRIVACY_CONFIG.enableLogging) {
    return; // Logging completely disabled
  }

  let logData = data;
  
  if (PRIVACY_CONFIG.redactSensitiveData && data) {
    logData = redactSensitiveData(data);
  }

  const timestamp = new Date().toISOString();
  const logMessage = `[${timestamp}] ${level.toUpperCase()}: ${message}`;
  
  if (logData) {
    console.log(logMessage, logData);
  } else {
    console.log(logMessage);
  }
}

// Redact sensitive data from logs
function redactSensitiveData(data: any): any {
  if (typeof data !== 'object' || data === null) {
    return data;
  }

  const sensitiveFields = [
    'username', 'name', 'id', 'user_id', 'userId', 'email', 'phone',
    'accessToken', 'token', 'secret', 'key', 'password', 'sessionData',
    'reviewer', 'reviewerUsername', 'reviewerXId', 'subjectXAccountId'
  ];

  const redacted = { ...data };
  
  for (const field of sensitiveFields) {
    if (field in redacted) {
      if (field.includes('id') || field.includes('Id')) {
        redacted[field] = anonymizeUserId(String(redacted[field]));
      } else {
        redacted[field] = '[REDACTED]';
      }
    }
  }

  // Recursively redact nested objects
  for (const key in redacted) {
    if (typeof redacted[key] === 'object' && redacted[key] !== null) {
      redacted[key] = redactSensitiveData(redacted[key]);
    }
  }

  return redacted;
}

// Privacy-safe session validation that doesn't log user data
export function validateSessionPrivately(sessionData: string): { valid: boolean; hash?: string } {
  try {
    const session = JSON.parse(atob(sessionData));
    const isValid = session && session.user && Date.now() <= session.expiresAt;
    
    return {
      valid: isValid,
      hash: isValid ? anonymizeUserId(session.user.id) : undefined
    };
  } catch {
    return { valid: false };
  }
}

// Rate limiting with anonymous keys
export function createAnonymousRateLimitKey(userId: string, action: string): string {
  return `${action}_${anonymizeUserId(userId)}`;
}

// Environment variable to completely disable all logging
export function disableAllLogging(): void {
  if (Deno.env.get("DISABLE_ALL_LOGS") === "true") {
    console.log = () => {};
    console.warn = () => {};
    console.error = () => {};
    console.info = () => {};
    console.debug = () => {};
  }
} 