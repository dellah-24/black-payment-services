/**
 * BlackPayments Wallet - Production Entry Point
 * Cloudflare Workers / Next.js API Routes handler
 */

import { logger } from './lib/logger';
import { env } from './lib/env';

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
 * Validate production configuration
 */
function validateProductionConfig(): void {
  const requiredEnvVars = [
    'NODE_ENV',
    'SUPABASE_URL',
    'SUPABASE_ANON_KEY',
    'HSM_API_URL',
    'HSM_API_KEY',
    'JWT_SECRET',
    'WALLET_ENCRYPTION_KEY',
  ];

  const missingVars = requiredEnvVars.filter((varName) => !env[varName as keyof typeof env]);

  if (missingVars.length > 0) {
    throw new Error(`Missing required environment variables: ${missingVars.join(', ')}`);
  }

  // Validate JWT secret length
  if (env.JWT_SECRET && env.JWT_SECRET.length < 32) {
    throw new Error('JWT_SECRET must be at least 32 characters');
  }

  // Validate encryption key length
  if (env.WALLET_ENCRYPTION_KEY && env.WALLET_ENCRYPTION_KEY.length < 32) {
    throw new Error('WALLET_ENCRYPTION_KEY must be at least 32 characters');
  }

  logger.info('Production configuration validated');
}

/**
 * Initialize application services
 */
async function initializeServices(): Promise<void> {
  // Initialize Sentry for error tracking
  if (env.SENTRY_DSN) {
    try {
      const { initSentry } = await import('./lib/sentry');
      initSentry();
      logger.info('Sentry initialized');
    } catch (error) {
      logger.warn('Failed to initialize Sentry', error as Error);
    }
  }

  // Initialize Redis for rate limiting
  if (env.REDIS_URL || env.UPSTASH_REDIS_REST_URL) {
    try {
      const { initRedis } = await import('./lib/redis');
      await initRedis();
      logger.info('Redis initialized');
    } catch (error) {
      logger.warn('Failed to initialize Redis', error as Error);
    }
  }

  // Initialize Supabase
  try {
    const { createClient } = await import('@supabase/supabase-js');
    const supabase = createClient(env.SUPABASE_URL, env.SUPABASE_ANON_KEY);
    logger.info('Supabase client initialized');
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
