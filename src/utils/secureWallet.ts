/**
 * Secure wallet utilities for production use
 * All cryptographic operations use production-grade libraries
 */

import { logger } from '@/lib/logger';
import { env } from '@/lib/env';

export interface SecureWalletConfig {
  encryptionKey: string;
  algorithm: 'AES-GCM';
  keyLength: number;
  ivLength: number;
}

export const SECURE_WALLET_CONFIG: SecureWalletConfig = {
  encryptionKey: env.WALLET_ENCRYPTION_KEY,
  algorithm: 'AES-GCM',
  keyLength: 256,
  ivLength: 12,
};

/**
 * Validates wallet configuration for production
 */
export function validateWalletConfig(): boolean {
  try {
    if (!SECURE_WALLET_CONFIG.encryptionKey) {
      throw new Error('WALLET_ENCRYPTION_KEY is not configured');
    }

    if (SECURE_WALLET_CONFIG.encryptionKey.length < 32) {
      throw new Error('WALLET_ENCRYPTION_KEY must be at least 32 characters');
    }

    if (env.NODE_ENV === 'production' && !env.HSM_API_URL) {
      throw new Error('HSM_API_URL is required in production');
    }

    return true;
  } catch (error) {
    logger.error('Wallet configuration validation failed', error as Error);
    return false;
  }
}

/**
 * Production wallet security checks
 */
export function performSecurityChecks(): {
  passed: boolean;
  checks: Array<{ name: string; passed: boolean; message?: string }>;
} {
  const checks = [
    {
      name: 'Encryption key configured',
      passed: !!SECURE_WALLET_CONFIG.encryptionKey,
      message: SECURE_WALLET_CONFIG.encryptionKey ? undefined : 'Missing WALLET_ENCRYPTION_KEY',
    },
    {
      name: 'HSM configured',
      passed: !!env.HSM_API_URL,
      message: env.HSM_API_URL ? undefined : 'Missing HSM_API_URL',
    },
    {
      name: 'Environment is production',
      passed: env.NODE_ENV === 'production',
      message: env.NODE_ENV === 'production' ? undefined : `Current environment: ${env.NODE_ENV}`,
    },
    {
      name: 'Supabase configured',
      passed: !!env.SUPABASE_URL && !!env.SUPABASE_ANON_KEY,
      message: (!env.SUPABASE_URL || !env.SUPABASE_ANON_KEY) ? 'Missing Supabase configuration' : undefined,
    },
  ];

  const passed = checks.every((check) => check.passed);

  return { passed, checks };
}
