/**
 * Serverless-Friendly Rate Limiter using Supabase
 * Replaces in-memory Map which doesn't persist across serverless invocations
 */

import { logger } from './logger';
import { supabase } from './supabaseClient';

interface RateLimitRecord {
  ip: string;
  count: number;
  window_start: number;
  updated_at: string;
}

const TABLE_NAME = 'rate_limits';
const WINDOW_MS = 15 * 60 * 1000; // 15 minutes
const MAX_REQUESTS = 100; // Max requests per window

/**
 * Initialize rate limiting table in Supabase
 * Run this once during deployment/setup
 */
export async function initRateLimitTable(): Promise<void> {
  // This should be executed via Supabase SQL editor
  const sql = `
    CREATE TABLE IF NOT EXISTS ${TABLE_NAME} (
      ip VARCHAR(45) PRIMARY KEY,
      count INTEGER NOT NULL DEFAULT 1,
      window_start TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    
    CREATE INDEX IF NOT EXISTS idx_rate_limits_updated 
    ON ${TABLE_NAME}(updated_at);
    
    -- Auto-cleanup old records (older than 1 hour)
    CREATE OR REPLACE FUNCTION cleanup_rate_limits()
    RETURNS void AS $$
    BEGIN
      DELETE FROM ${TABLE_NAME} 
      WHERE updated_at < NOW() - INTERVAL '1 hour';
    END;
    $$ LANGUAGE plpgsql;
  `;
  
  logger.info('Run the following SQL in Supabase SQL Editor to set up rate limiting:', { sql });
}

/**
 * Check if an IP address is rate limited
 * @param ip - The IP address to check
 * @returns { allowed: boolean, remaining: number, resetAt: number }
 */
export async function checkRateLimit(ip: string): Promise<{
  allowed: boolean;
  remaining: number;
  resetAt: number;
}> {
  try {
    const now = Date.now();
    const windowStart = now - WINDOW_MS;

    // Use Supabase RPC or direct query with upsert
    // Upsert: insert or update the rate limit record
    const { data: record, error: fetchError } = await supabase
      .from(TABLE_NAME)
      .select('*')
      .eq('ip', ip)
      .single();

    if (fetchError && fetchError.code !== 'PGRST116') {
      // PGRST116 = not found, which is expected for new IPs
      logger.error('Rate limit fetch error', fetchError as Error, { ip });
      // Allow on error but log
      return { allowed: true, remaining: MAX_REQUESTS, resetAt: now + WINDOW_MS };
    }

    let count = 1;
    let windowStartTime = now;

    if (record) {
      // Check if window has expired
      const recordWindowStart = new Date(record.window_start).getTime();
      
      if (recordWindowStart < windowStart) {
        // Window expired, reset count
        count = 1;
        windowStartTime = now;
      } else {
        // Within window, increment count
        count = record.count + 1;
        windowStartTime = recordWindowStart;
      }
    }

    // Check if limit exceeded
    const allowed = count <= MAX_REQUESTS;
    const remaining = Math.max(0, MAX_REQUESTS - count);
    const resetAt = windowStartTime + WINDOW_MS;

    // Upsert the record
    const { error: upsertError } = await supabase
      .from(TABLE_NAME)
      .upsert(
        {
          ip,
          count,
          window_start: new Date(windowStartTime).toISOString(),
          updated_at: new Date().toISOString(),
        },
        {
          onConflict: 'ip',
        }
      );

    if (upsertError) {
      // Fail open - allow request if rate limiting upsert fails (e.g., RLS policy)
      logger.debug('Rate limit upsert failed (allowing request)', { ip, error: upsertError.message });
    }

    return { allowed, remaining, resetAt };
  } catch (error) {
    logger.error('Rate limit check failed', error as Error, { ip });
    // Fail open - allow request if rate limiting fails
    return { allowed: true, remaining: MAX_REQUESTS, resetAt: Date.now() + WINDOW_MS };
  }
}

/**
 * Get current rate limit status for an IP
 */
export async function getRateLimitStatus(ip: string): Promise<{
  count: number;
  windowStart: number;
  max: number;
  resetAt: number;
}> {
  try {
    const { data: record, error } = await supabase
      .from(TABLE_NAME)
      .select('*')
      .eq('ip', ip)
      .single();

    if (error || !record) {
      return {
        count: 0,
        windowStart: Date.now(),
        max: MAX_REQUESTS,
        resetAt: Date.now() + WINDOW_MS,
      };
    }

    const windowStart = new Date(record.window_start).getTime();
    const now = Date.now();
    
    // If window expired, treat as 0
    if (windowStart < now - WINDOW_MS) {
      return {
        count: 0,
        windowStart: now,
        max: MAX_REQUESTS,
        resetAt: now + WINDOW_MS,
      };
    }

    return {
      count: record.count,
      windowStart,
      max: MAX_REQUESTS,
      resetAt: windowStart + WINDOW_MS,
    };
  } catch (error) {
    logger.error('Rate limit status fetch failed', error as Error, { ip });
    return {
      count: 0,
      windowStart: Date.now(),
      max: MAX_REQUESTS,
      resetAt: Date.now() + WINDOW_MS,
    };
  }
}

/**
 * Reset rate limit for an IP (admin function)
 */
export async function resetRateLimit(ip: string): Promise<boolean> {
  try {
    const { error } = await supabase
      .from(TABLE_NAME)
      .delete()
      .eq('ip', ip);

    if (error) {
      logger.error('Rate limit reset failed', error as Error, { ip });
      return false;
    }

    return true;
  } catch (error) {
    logger.error('Rate limit reset exception', error as Error, { ip });
    return false;
  }
}

/**
 * Clean up old rate limit records
 */
export async function cleanupRateLimits(): Promise<number> {
  try {
    const { data, error } = await supabase
      .rpc('cleanup_rate_limits');

    if (error) {
      logger.error('Rate limit cleanup failed', error as Error);
      return 0;
    }

    logger.info('Rate limit cleanup completed');
    return 0; // Function returns void in SQL
  } catch (error) {
    logger.error('Rate limit cleanup exception', error as Error);
    return 0;
  }
}