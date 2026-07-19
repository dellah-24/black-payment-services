/**
 * Server bootstrap: initialize secrets and validate critical production config.
 *
 * This module performs one-time initialization when imported from server code.
 * It is safe to import multiple times; initialization runs once.
 */

import { initSecrets, hasSecret } from '@/lib/secrets';

let bootstrapped = false;

function validateProductionConfig() {
  if (process.env.NODE_ENV !== 'production') return;

  const missing: string[] = [];

  // Minimal critical secrets for production
  // RESEND_API_KEY is intentionally omitted: the email module falls back
  // to Mailgun when Resend is not configured, so it is not a hard requirement.
  if (!hasSecret('JWT_SECRET')) missing.push('JWT_SECRET');

  if (missing.length > 0) {
    const message = `Missing required secrets in production: ${missing.join(', ')}`;
    // Fail fast in production to avoid undefined behavior
    throw new Error(message);
  }
}

export function bootstrapServer(): void {
  if (bootstrapped) return;
  initSecrets();
  validateProductionConfig();
  bootstrapped = true;
}

// Run on import for convenience in API routes and server-only modules
// Avoid running during Next.js build phase to prevent build-time secret checks
const __IS_NEXT_BUILD__ = process.env.NEXT_PHASE === 'phase-production-build';
if (!__IS_NEXT_BUILD__) {
  bootstrapServer();
}
