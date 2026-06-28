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
