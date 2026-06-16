import { getEnv } from '@/lib/env';
import { isProduction } from '@/lib/env';

export interface RedisRestConfig {
  restUrl?: string;
  restToken?: string;
  url?: string;
  token?: string;
}

interface MemoryRecord {
  value: string;
  expiresAt: number;
}

const memoryStore = new Map<string, MemoryRecord>();

function purgeExpiredMemoryStore(): void {
  const now = Date.now();
  for (const [key, record] of memoryStore.entries()) {
    if (record.expiresAt <= now) {
      memoryStore.delete(key);
    }
  }
}

async function memorySet(key: string, value: string, ttlMs?: number): Promise<void> {
  purgeExpiredMemoryStore();
  memoryStore.set(key, { value, expiresAt: ttlMs ? Date.now() + ttlMs : Number.POSITIVE_INFINITY });
}

async function memoryGet(key: string): Promise<string | null> {
  purgeExpiredMemoryStore();
  return memoryStore.get(key)?.value ?? null;
}

async function memoryDelete(key: string): Promise<boolean> {
  return memoryStore.delete(key);
}

async function memoryTrySetIfAbsent(key: string, value: string, ttlMs?: number): Promise<boolean> {
  purgeExpiredMemoryStore();
  if (memoryStore.has(key)) {
    return false;
  }
  memoryStore.set(key, { value, expiresAt: ttlMs ? Date.now() + ttlMs : Number.POSITIVE_INFINITY });
  return true;
}

async function memoryIncrement(key: string, ttlMs?: number): Promise<number> {
  purgeExpiredMemoryStore();
  const current = Number(memoryStore.get(key)?.value ?? '0');
  const next = Number.isFinite(current) ? current + 1 : 1;
  memoryStore.set(key, { value: String(next), expiresAt: ttlMs ? Date.now() + ttlMs : Number.POSITIVE_INFINITY });
  return next;
}

export class RedisRestClient {
  private readonly baseUrl: string | null;
  private readonly token: string | null;

  constructor(config: RedisRestConfig = {}) {
    this.baseUrl = (config.restUrl || config.url || getEnv('REDIS_REST_URL') || getEnv('UPSTASH_REDIS_REST_URL'))?.replace(/\/$/, '') || null;
    this.token = config.restToken || config.token || getEnv('REDIS_REST_TOKEN') || getEnv('UPSTASH_REDIS_REST_TOKEN') || null;
  }

 get isConfigured(): boolean {
   return Boolean(this.baseUrl && this.token);
 }

  async command<T>(command: string, args: string[]): Promise<T | null> {
    if (!this.baseUrl) {
      return null;
    }

    const url = `${this.baseUrl}/${command}${args.length ? `/${args.map(encodeURIComponent).join('/')}` : ''}`;
    const response = await fetch(url, {
      method: 'POST',
      headers: this.token ? { Authorization: `Bearer ${this.token}` } : undefined,
      body: JSON.stringify(args),
    });

    if (!response.ok) {
      throw new Error(`Redis REST command failed (${command}): ${response.status} ${response.statusText}`);
    }

    const payload = (await response.json().catch(() => ({}))) as { result?: T; error?: string };
    if (payload.error) {
      throw new Error(payload.error);
    }

    return payload.result ?? null;
  }
}

export class RedisBackedStore {
  private readonly redis: RedisRestClient;
  private readonly requireRedisInProduction: boolean;

  constructor(redis: RedisRestClient = new RedisRestClient(), options: { requireRedisInProduction?: boolean } = {}) {
    this.redis = redis;
    this.requireRedisInProduction = Boolean(options.requireRedisInProduction);
    if (this.requireRedisInProduction && !this.redis.isConfigured) {
      throw new Error('Redis/Upstash is required in production. Configure REDIS_REST_URL and REDIS_REST_TOKEN.');
    }
  }

  async set(key: string, value: string, ttlMs?: number): Promise<void> {
    try {
      if (this.redis.isConfigured) {
        await this.redis.command<'OK' | null>('set', [key, value, ...(ttlMs ? ['PX', String(ttlMs)] : [])]);
        return;
      }
    } catch {
      if (isProduction()) throw new Error('Redis/Upstash is unavailable in production.');
    }
    await memorySet(key, value, ttlMs);
  }

  async get(key: string): Promise<string | null> {
    try {
      if (this.redis.isConfigured) {
        const value = await this.redis.command<string | null>('get', [key]);
        if (value !== null) return value;
      }
    } catch {
      if (isProduction()) throw new Error('Redis/Upstash is unavailable in production.');
    }
    return memoryGet(key);
  }

  async delete(key: string): Promise<boolean> {
    try {
      if (this.redis.isConfigured) {
        const deleted = await this.redis.command<number>('del', [key]);
        return Number(deleted ?? 0) > 0;
      }
    } catch {
      if (isProduction()) throw new Error('Redis/Upstash is unavailable in production.');
    }
    return memoryDelete(key);
  }

  async trySetIfAbsent(key: string, value: string, ttlMs?: number): Promise<boolean> {
    try {
      if (this.redis.isConfigured) {
        const result = await this.redis.command<'OK' | null>('set', [key, value, 'NX', 'PX', String(ttlMs ?? 0)]);
        return result === 'OK';
      }
    } catch {
      if (isProduction()) throw new Error('Redis/Upstash is unavailable in production.');
    }
    return memoryTrySetIfAbsent(key, value, ttlMs);
  }

  async increment(key: string, ttlMs?: number): Promise<number> {
    try {
      if (this.redis.isConfigured) {
        const value = await this.redis.command<number | string | null>('incr', [key]);
        if (value !== null) {
          if (ttlMs) {
            await this.redis.command<'OK' | null>('expire', [key, String(Math.ceil(ttlMs / 1000))]);
          }
          return Number(value);
        }
      }
    } catch {
      if (isProduction()) throw new Error('Redis/Upstash is unavailable in production.');
    }
    return memoryIncrement(key, ttlMs);
  }
}

export class IdempotencyStore {
 constructor(private readonly store: RedisBackedStore = new RedisBackedStore(undefined, { requireRedisInProduction: isProduction() })) {}

  async tryCreate(key: string, ttlMs = 24 * 60 * 60 * 1000): Promise<boolean> {
    return this.store.trySetIfAbsent(this.keyFor(key), '1', ttlMs);
  }

  async set<T>(key: string, value: T, ttlMs = 24 * 60 * 60 * 1000): Promise<void> {
    await this.store.set(this.keyFor(key), JSON.stringify(value), ttlMs);
  }

  async get<T>(key: string): Promise<T | null> {
    const raw = await this.store.get(this.keyFor(key));
    if (!raw) return null;
    return JSON.parse(raw) as T;
  }

  private keyFor(key: string): string {
    return `custodial:idempotency:${key}`;
  }
}

export class WithdrawalLock {
 constructor(private readonly store: RedisBackedStore = new RedisBackedStore(undefined, { requireRedisInProduction: isProduction() })) {}

  async tryAcquire(userId: string, ttlMs = 2 * 60 * 1000): Promise<boolean> {
    return this.store.trySetIfAbsent(this.key(userId), '1', ttlMs);
  }

  async release(userId: string): Promise<boolean> {
    return this.store.delete(this.key(userId));
  }

  private key(userId: string): string {
    return `custodial:withdrawal-lock:${userId}`;
  }
}

export class RateLimiter {
 constructor(private readonly store: RedisBackedStore = new RedisBackedStore(undefined, { requireRedisInProduction: isProduction() })) {}

  async consume(key: string, limit: number, windowMs: number): Promise<{ allowed: boolean; count: number; remaining: number; resetAt: number }> {
    const count = await this.store.increment(this.key(key), windowMs);
    return {
      allowed: count <= limit,
      count,
      remaining: Math.max(limit - count, 0),
      resetAt: Date.now() + windowMs,
    };
  }

  private key(key: string): string {
    return `custodial:rate-limit:${key}`;
  }
}
