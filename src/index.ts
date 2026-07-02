/**
 * BlackPayments Wallet - Production Entry Point
 * Cloudflare Workers / Next.js API Routes handler
 */

import { logger } from './lib/logger';
import { env, validateProductionConfig } from './lib/env';

// Re-export wallet types and factory functions
export { BlackPaymentsWallet, WalletChain, createWallet, createWalletWithExistingSeed, generateMnemonic } from './wallet';

/**
 * Production application bootstrap
 */
export async function bootstrap(): Promise<void> {
  try {
    logger.info('Starting BlackPayments Wallet', {
      environment: env.NODE_ENV,
      version: '1.0.0',
      nodeVersion: process.version,
    });

    // Validate production configuration
    if (env.NODE_ENV === 'production') {
      validateProductionConfig();
    }

    // Initialize services
    await initializeServices();

    logger.info('BlackPayments Wallet started successfully');
  } catch (error) {
    logger.error('Failed to start BlackPayments Wallet', error as Error);
    throw error;
  }
}

/**
 * Initialize application services
 */
async function initializeServices(): Promise<void> {
  // Initialize Sentry for error tracking
  if (env.SENTRY_DSN) {
    try {
      const sentry = await import('./lib/sentry');
      sentry.default.init(env.SENTRY_DSN);
      logger.info('Sentry initialized');
    } catch (error) {
      logger.warn('Failed to initialize Sentry', error as Error);
    }
  }

  // Redis is available via exported classes (RedisBackedStore, RateLimiter, etc.)
  // No explicit initialization needed
  if (env.REDIS_URL || env.UPSTASH_REDIS_REST_URL) {
    logger.info('Redis configuration detected');
  }

  // Initialize Supabase
  try {
    const { createClient } = await import('@supabase/supabase-js');
    if (env.SUPABASE_URL && env.SUPABASE_ANON_KEY) {
      const supabase = createClient(env.SUPABASE_URL, env.SUPABASE_ANON_KEY);
      logger.info('Supabase client initialized');
    }
  } catch (error) {
    logger.warn('Failed to initialize Supabase client', error as Error);
  }

  logger.info('All services initialized');
}

/**
 * Health check handler
 */
export async function healthCheck(): Promise<{ status: string; timestamp: string }> {
  return {
    status: 'healthy',
    timestamp: new Date().toISOString(),
  };
}

// Start the application if this is the main module
if (require.main === module) {
  bootstrap().catch((error) => {
    logger.error('Application bootstrap failed', error);
    process.exit(1);
  });
}
