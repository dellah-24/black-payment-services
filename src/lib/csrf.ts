/**
 * CSRF Token Storage and Utilities
 * Shared between middleware and API routes
 */



function getWebCrypto(): Crypto {
  if (!globalThis.crypto) {
    throw new Error('Web Crypto API is not available in this runtime');
  }
  return globalThis.crypto;
}

function randomBytes(length: number): Uint8Array {
  const bytes = new Uint8Array(length);
  getWebCrypto().getRandomValues(bytes);
  return bytes;
}

function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('');
}

// In-memory storage for CSRF tokens (server-side)
// Note: For production with multiple serverless instances, use Redis or database
const csrfTokens = new Map<string, { token: string; expires: number }>();

export const CSRF_TOKEN_EXPIRY = 60 * 60 * 1000; // 1 hour

/**
 * Generate a CSRF token for a given session ID
 * Stores the token in memory with expiry
 */
export function generateCSRFToken(sessionId: string): string {
  const token = bytesToHex(randomBytes(32));
  csrfTokens.set(sessionId, { token, expires: Date.now() + CSRF_TOKEN_EXPIRY });
  return token;
}

/**
 * Validate a CSRF token against the stored token for a session
 */
export function validateCSRFToken(sessionId: string, token: string): boolean {
  const stored = csrfTokens.get(sessionId);
  if (!stored || stored.expires < Date.now()) {
    csrfTokens.delete(sessionId);
    return false;
  }
  return stored.token === token;
}

/**
 * Clean up expired CSRF tokens
 * Call periodically to free memory
 */
export function cleanupCSRFTokens(): void {
  const now = Date.now();
  for (const [key, value] of csrfTokens.entries()) {
    if (value.expires < now) {
      csrfTokens.delete(key);
    }
  }
}

/**
 * Delete a CSRF token (e.g., on logout)
 */
export function deleteCSRFToken(sessionId: string): void {
  csrfTokens.delete(sessionId);
}
