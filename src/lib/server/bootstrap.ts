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
  if (!hasSecret('JWT_SECRET')) missing.push('JWT_SECRET');
  if (!hasSecret('RESEND_API_KEY')) missing.push('RESEND_API_KEY');

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
bootstrapServer();
