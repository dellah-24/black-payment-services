import { createClient } from '@supabase/supabase-js';
import { getEnv, isPlaceholder, isProduction } from '@/lib/env';
import { logger } from '@/lib/logger';

export interface RateLimitConfig {
  windowMs: number;
  maxRequests: number;
  keyPrefix: string;
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: Date;
}

interface RateLimitRow {
  key: string;
  count: number;
  window_start: string;
  window_end: string;
}

const defaultConfig: RateLimitConfig = {
  windowMs: 60 * 1000, // 1 minute
  maxRequests: 100,
  keyPrefix: 'ratelimit',
};

export class RateLimiter {
  private config: RateLimitConfig;
  private supabase: any;

  constructor(config: Partial<RateLimitConfig> = {}) {
    this.config = { ...defaultConfig, ...config };
    const supabaseUrl = getEnv('NEXT_PUBLIC_SUPABASE_URL');
    const supabaseAnonKey = getEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY');
    this.supabase = createClient(supabaseUrl ?? '', supabaseAnonKey ?? '');
  }

  async checkLimit(identifier: string): Promise<RateLimitResult> {
    const key = `${this.config.keyPrefix}:${identifier}`;
    const now = new Date();
    const windowStart = new Date(now.getTime() - this.config.windowMs);

    try {
      const { data, error } = await this.supabase
        .from('rate_limits')
        .select('*')
        .eq('key', key)
        .gte('window_start', windowStart.toISOString())
        .single();

      if (error || !data) {
        const { error: insertError } = await this.supabase
          .from('rate_limits')
          .insert({
            key,
            count: 1,
            window_start: now.toISOString(),
            window_end: new Date(now.getTime() + this.config.windowMs).toISOString(),
          });

        if (insertError) {
          logger.error('Failed to create rate limit record', insertError);
        }

        return {
          allowed: true,
          remaining: this.config.maxRequests - 1,
          resetAt: new Date(now.getTime() + this.config.windowMs),
        };
      }

      const rateData = data as RateLimitRow;
      const remaining = this.config.maxRequests - rateData.count;
      const resetAt = new Date(rateData.window_end);

      if (rateData.count >= this.config.maxRequests) {
        return {
          allowed: false,
          remaining: 0,
          resetAt,
        };
      }

      const { error: updateError } = await this.supabase
        .from('rate_limits')
        .update({ count: rateData.count + 1 })
        .eq('key', key);

      if (updateError) {
        logger.error('Failed to update rate limit', updateError);
      }

      return {
        allowed: true,
        remaining: remaining - 1,
        resetAt,
      };
    } catch (error) {
      logger.error('Rate limit check failed', error as Error);
      return {
        allowed: true,
        remaining: this.config.maxRequests,
        resetAt: new Date(now.getTime() + this.config.windowMs),
      };
    }
  }

  async resetLimit(identifier: string): Promise<void> {
    const key = `${this.config.keyPrefix}:${identifier}`;

    const { error } = await this.supabase
      .from('rate_limits')
      .delete()
      .eq('key', key);

    if (error) {
      logger.error('Failed to reset rate limit', error);
    }
  }
}

export const apiRateLimiter = new RateLimiter({
  windowMs: 60 * 1000,
  maxRequests: 100,
  keyPrefix: 'ratelimit:api',
});

export const authRateLimiter = new RateLimiter({
  windowMs: 15 * 60 * 1000,
  maxRequests: 10,
  keyPrefix: 'ratelimit:auth',
});

export const paymentRateLimiter = new RateLimiter({
  windowMs: 60 * 1000,
  maxRequests: 20,
  keyPrefix: 'ratelimit:payment',
});
