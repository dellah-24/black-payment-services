/**
 * Production-safe environment helpers.
 *
 * NEXT_PUBLIC_* values are bundled into the browser. Server-only secrets must
 * never be exported or prefixed with NEXT_PUBLIC_.
 */

export function isProduction(): boolean {
  return process.env.NODE_ENV === 'production' || process.env.NEXT_PUBLIC_VERCEL_ENV === 'production';
}

const PLACEHOLDER_VALUES = new Set([
  'your-project',
  'your-project.supabase.co',
  'your-anon-key',
  'your-anon-key-here',
  'your-service-role-key',
  'your-secret-key',
  'your-alchemy-api-key',
  'your-ethereum-api-key',
  'your-bsc-api-key',
  'your-polygon-api-key',
  'your-arbitrum-api-key',
  'your-optimism-api-key',
  'your-avalanche-api-key',
  'your-celo-rpc',
  'your-linea-api-key',
  'your-base-api-key',
  'your-solana-api-key',
  'your-tron-api-key',
  'your-private-ethereum-rpc',
  'your-private-bsc-rpc',
  'your-private-polygon-rpc',
  'your-private-arbitrum-rpc',
  'your-private-optimism-rpc',
  'your-private-avalanche-rpc',
  'your-private-tron-rpc',
  'your-private-tron-full-node',
  'your-private-tron-solidity-node',
  'your-private-tron-event-server',
  'replace-with-12-or-24-word-dev-only-mnemonic',
  'dev-only-mnemonic',
  'your-hsm-api-token',
  'https://hsm.example.internal',
  'your-hsm-base-url',
  'your-redis-rest-url',
  'your-redis-rest-token',
  'your-upstash-url',
  'your-upstash-token',
  'localhost:3000',
  'http://localhost:3000',
  '127.0.0.1:3000',
  'http://127.0.0.1:3000',
  'local.dev',
  'example.com',
  'wallet.blackpayments.example',
]);

export function isPlaceholder(value: string | undefined): boolean {
  if (!value) return true;
  const normalized = value.trim().toLowerCase();
  return (
    PLACEHOLDER_VALUES.has(normalized) ||
    normalized.includes('your-project') ||
    normalized.includes('your-anon-key') ||
    normalized.includes('your-private-') ||
    normalized.includes('your-redis-') ||
    normalized.includes('your-hsm-') ||
    normalized.includes('your-upstash-')
  );
}

export function getEnv(name: string, defaultValue?: string): string | undefined {
  const value = process.env[name];
  return value && !isPlaceholder(value) ? value : defaultValue;
}

export function getOptionalEnv(name: string): string | undefined {
  return getEnv(name);
}

export function isLocalhostUrl(value: string | undefined): boolean {
  if (!value) return false;
  try {
    const url = new URL(value);
    return url.hostname === 'localhost' || url.hostname === '127.0.0.1' || url.hostname === '0.0.0.0';
  } catch {
    return false;
  }
}

export function requireNonLocalAppUrl(): string {
  const value = getAppBaseUrl();
  if (isProduction() && isLocalhostUrl(value)) {
    throw new Error('NEXT_PUBLIC_APP_URL must point to your production domain, not localhost or 127.0.0.1.');
  }
  return value;
}

export function requireProductionSecret(name: string): string {
  if (!isProduction()) return requireEnv(name, { allowLocalDev: true });
  return requireEnv(name);
}

export function requireProductionHttpsUrl(name: string): string {
  const value = isProduction() ? requireHttpsUrl(name) : requireHttpUrl(name);
  if (isProduction() && isLocalhostUrl(value)) {
    throw new Error(`${name} must be a public production HTTPS endpoint.`);
  }
  return value;
}

export function validateProductionConfig(): void {
  if (!isProduction()) return;
  requireProductionSecret('SUPABASE_SERVICE_ROLE_KEY');
  requireProductionSecret('CUSTODIAL_HSM_TOKEN');
  if (!getEnv('REDIS_REST_URL') && !getEnv('UPSTASH_REDIS_REST_URL')) {
    throw new Error('REDIS_REST_URL or UPSTASH_REDIS_REST_URL is required in production.');
  }
  if (!getEnv('REDIS_REST_TOKEN') && !getEnv('UPSTASH_REDIS_REST_TOKEN')) {
    throw new Error('REDIS_REST_TOKEN or UPSTASH_REDIS_REST_TOKEN is required in production.');
  }
  requireProductionHttpsUrl('NEXT_PUBLIC_APP_URL');
}

export function requireEnv(name: string, options: { allowLocalDev?: boolean } = {}): string {
  const value = getEnv(name);
  if (value) return value;

  const hasDevValue = Boolean(process.env[name]);
  if (options.allowLocalDev && !isProduction() && hasDevValue) {
    return process.env[name] as string;
  }

  throw new Error(`${name} is required${isProduction() ? ' in production' : ''}. Check .env.local or your deployment secrets.`);
}

export function requirePublicEnv(name: string): string {
  return requireEnv(name);
}

export function requireHttpUrl(name: string): string {
  const value = requireEnv(name);
  try {
    const url = new URL(value);
    if (!['http:', 'https:'].includes(url.protocol)) {
      throw new Error(`${name} must be an http(s) URL.`);
    }
    return value;
  } catch (error) {
    if (error instanceof TypeError) {
      throw new Error(`${name} must be a valid http(s) URL.`);
    }
    throw error;
  }
}

export function requireHttpsUrl(name: string): string {
  const value = requireEnv(name);
  const url = new URL(value);
  if (url.protocol !== 'https:') {
    throw new Error(`${name} must be an https URL.`);
  }
  return value;
}

export function getAppBaseUrl(): string {
  const configured = getEnv('NEXT_PUBLIC_APP_URL') || (getEnv('NEXT_PUBLIC_VERCEL_URL') ? `https://${getEnv('NEXT_PUBLIC_VERCEL_URL')}` : undefined);
  if (configured) return configured.replace(/\/$/, '');
  if (!isProduction()) return 'http://localhost:3000';
  throw new Error('NEXT_PUBLIC_APP_URL is required in production for payment links and callbacks.');
}
