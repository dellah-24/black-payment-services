/**
 * Rate Limiter - Transaction and API Rate Limiting
 * Implements token bucket algorithm for transaction throttling
 */

import { logger } from './logger';

/**
 * Rate limit configuration
 */
export interface RateLimitConfig {
  maxRequests: number;    // Max requests allowed
  windowMs: number;      // Time window in milliseconds
  blockDurationMs?: number; // How long to block after limit exceeded
}

/**
 * Rate limit result
 */
export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: number;
  retryAfterMs?: number;
}

/**
 * Token bucket rate limiter
 */
class TokenBucket {
  private tokens: number;
  private lastRefill: number;
  private config: RateLimitConfig;
  
  constructor(config: RateLimitConfig) {
    this.config = config;
    this.tokens = config.maxRequests;
    this.lastRefill = Date.now();
  }
  
  /**
   * Try to consume a token
   */
  consume(): RateLimitResult {
    this.refill();
    
    if (this.tokens >= 1) {
      this.tokens -= 1;
      return {
        allowed: true,
        remaining: Math.floor(this.tokens),
        resetAt: this.lastRefill + this.config.windowMs
      };
    }
    
    // Calculate retry time
    const tokensNeeded = 1;
    const timeNeeded = (tokensNeeded / this.config.maxRequests) * this.config.windowMs;
    const retryAfterMs = Math.max(0, timeNeeded - (Date.now() - this.lastRefill));
    
    return {
      allowed: false,
      remaining: 0,
      resetAt: this.lastRefill + this.config.windowMs,
      retryAfterMs
    };
  }
  
  /**
   * Refill tokens based on time elapsed
   */
  private refill(): void {
    const now = Date.now();
    const elapsed = now - this.lastRefill;
    
    if (elapsed >= this.config.windowMs) {
      this.tokens = this.config.maxRequests;
      this.lastRefill = now;
    } else {
      // Partial refill
      const tokensToAdd = (elapsed / this.config.windowMs) * this.config.maxRequests;
      this.tokens = Math.min(this.config.maxRequests, this.tokens + tokensToAdd);
      this.lastRefill = now;
    }
  }
  
  /**
   * Get current status
   */
  getStatus(): { remaining: number; resetAt: number } {
    this.refill();
    return {
      remaining: Math.floor(this.tokens),
      resetAt: this.lastRefill + this.config.windowMs
    };
  }
}

/**
 * Rate limiter for different operation types
 */
export class RateLimiter {
  private limiters: Map<string, TokenBucket> = new Map();
  
  // Default configurations
  private readonly CONFIGS = {
    // Transaction rate limits
    sendUSDT: { maxRequests: 10, windowMs: 60 * 1000 },      // 10 tx per minute
    sendNative: { maxRequests: 10, windowMs: 60 * 1000 },
    swap: { maxRequests: 5, windowMs: 60 * 1000 },              // 5 swaps per minute
    
    // API rate limits
    walletOperations: { maxRequests: 30, windowMs: 60 * 1000 }, // 30 ops per minute
    balanceQueries: { maxRequests: 60, windowMs: 60 * 1000 },  // 60 queries per minute
    p2pOrders: { maxRequests: 20, windowMs: 60 * 1000 },    // 20 orders per minute
    
    // Account actions
    walletCreation: { maxRequests: 5, windowMs: 60 * 60 * 1000 }, // 5 per hour
    importWallet: { maxRequests: 10, windowMs: 60 * 60 * 1000 },   // 10 per hour
  } as const;
  
  /**
   * Get or create a limiter for an operation type
   */
  private getLimiter(operation: string): TokenBucket {
    const config = this.CONFIGS[operation as keyof typeof this.CONFIGS];
    
    if (!config) {
      // Default to wallet operations if unknown
      return this.getLimiter('walletOperations');
    }
    
    if (!this.limiters.has(operation)) {
      this.limiters.set(operation, new TokenBucket(config as RateLimitConfig));
    }
    
    return this.limiters.get(operation)!;
  }
  
  /**
   * Check if operation is allowed
   */
  check(operation: string): RateLimitResult {
    const limiter = this.getLimiter(operation);
    return limiter.consume();
  }
  
  /**
   * Middleware-style check for API routes
   */
  middleware(operation: keyof typeof RateLimiter.prototype.CONFIGS) {
    return (req: Request): { allowed: boolean; error?: string } => {
      const result = this.check(operation);
      
      if (!result.allowed) {
        logger.warn('Rate limit exceeded', {
          operation,
          remaining: result.remaining,
          resetAt: new Date(result.resetAt).toISOString()
        });
        
        return {
          allowed: false,
          error: `Rate limit exceeded. Try again in ${Math.ceil((result.retryAfterMs || 0) / 1000)} seconds.`
        };
      }
      
      return { allowed: true };
    };
  }
  
  /**
   * Get status for monitoring
   */
  getStatus(operation: string): { remaining: number; resetAt: number } | null {
    const limiter = this.limiters.get(operation);
    if (!limiter) return null;
    return limiter.getStatus();
  }
  
  /**
   * Reset limiter (for testing)
   */
  reset(operation?: string): void {
    if (operation) {
      this.limiters.delete(operation);
    } else {
      this.limiters.clear();
    }
  }
}

// Export singleton instance
export const rateLimiter = new RateLimiter();

// Helper function for checking transaction rate limits
export function checkTransactionLimit(txType: 'sendUSDT' | 'sendNative' | 'swap'): RateLimitResult {
  return rateLimiter.check(txType);
}