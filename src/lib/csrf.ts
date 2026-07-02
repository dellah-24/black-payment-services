import { getEnv, isPlaceholder, isProduction } from '@/lib/env';
import { logger } from '@/lib/logger';

export function generateCsrfToken(): string {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return Array.from(array, (byte) => byte.toString(16).padStart(2, '0')).join('');
}

export function validateCsrfToken(token: string | null | undefined): boolean {
  if (!token) {
    return false;
  }

  if (typeof token !== 'string') {
    return false;
  }

  if (token.length !== 64) {
    return false;
  }

  if (!/^[a-f0-9]{64}$/i.test(token)) {
    return false;
  }

  return true;
}

export function getCsrfTokenFromRequest(request: Request): string | null {
  const cookieToken = request.headers.get('cookie')?.match(/csrf-token=([^;]+)/)?.[1];
  if (cookieToken) {
    return decodeURIComponent(cookieToken);
  }

  const headerToken = request.headers.get('x-csrf-token');
  if (headerToken) {
    return headerToken;
  }

  return null;
}

export function verifyCsrfToken(request: Request): boolean {
  const token = getCsrfTokenFromRequest(request);
  return validateCsrfToken(token);
}

// In-memory store for CSRF tokens (for cleanup functionality)
const csrfTokenStore = new Map<string, { token: string; expiresAt: number }>();

/**
 * Store a CSRF token for a session
 */
export function storeCsrfToken(sessionId: string, token: string, expiresInMs = 3600000): void {
  csrfTokenStore.set(sessionId, {
    token,
    expiresAt: Date.now() + expiresInMs,
  });
}

/**
 * Validate CSRF token against stored token for a session
 */
export function validateCSRFToken(sessionId: string, token: string): boolean {
  const stored = csrfTokenStore.get(sessionId);
  if (!stored) {
    return false;
  }
  if (Date.now() > stored.expiresAt) {
    csrfTokenStore.delete(sessionId);
    return false;
  }
  return stored.token === token;
}

/**
 * Clean up expired CSRF tokens
 */
export function cleanupCSRFTokens(): void {
  const now = Date.now();
  for (const [sessionId, data] of csrfTokenStore.entries()) {
    if (now > data.expiresAt) {
      csrfTokenStore.delete(sessionId);
    }
  }
}
