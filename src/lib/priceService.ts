/**
 * Price Service - Real-time cryptocurrency prices from Alchemy Prices API
 */

import { logger } from '@/lib/logger';
import { getEnv, isProduction } from '@/lib/env';

function getAlchemyApiKey(): string {
  const apiKey = getEnv('NEXT_PUBLIC_ALCHEMY_API_KEY') || getEnv('ALCHEMY_API_KEY');
  if (!apiKey) {
    if (isProduction()) throw new Error('ALCHEMY_API_KEY or NEXT_PUBLIC_ALCHEMY_API_KEY is required in production for price lookups.');
    return '';
  }
  return apiKey;
}

const ALCHEMY_API_KEY = getAlchemyApiKey();
const ALCHEMY_PRICES_API = ALCHEMY_API_KEY ? `https://api.g.alchemy.com/prices/v1/${ALCHEMY_API_KEY}` : '';

// Cache for prices (5 minute expiry)
const priceCache: { [key: string]: { price: number; timestamp: number } } = {};
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

export interface PriceData {
  usd: number;
  usd_24h_change: number;
  usd_market_cap: number;
}

// Symbol mapping for Alchemy Prices API
const SYMBOL_MAP: Record<string, string> = {
  ETH: 'ETH',
  BTC: 'BTC',
  USDT: 'USDT',
  BNB: 'BNB',
  SOL: 'SOL',
  TRX: 'TRX',
  MATIC: 'MATIC',
  AVAX: 'AVAX',
  ADA: 'ADA',
  XRP: 'XRP',
  DOT: 'DOT',
  DOGE: 'DOGE',
  CELO: 'CELO',
};

/**
 * Get current USDT price from Alchemy Prices API
 */
export async function getUSDTPrice(): Promise<PriceData> {
  const cacheKey = 'USDT';
  const cached = priceCache[cacheKey];
  
  if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
    return {
      usd: cached.price,
      usd_24h_change: 0,
      usd_market_cap: 0,
    };
  }

  try {
    if (!ALCHEMY_API_KEY) return { usd: cached?.price || 1, usd_24h_change: 0, usd_market_cap: 0 };
    const response = await fetch(
      `${ALCHEMY_PRICES_API}/tokens/by-symbol?symbols=USDT`,
      {
        headers: {
          'Authorization': `Bearer ${ALCHEMY_API_KEY}`,
          'Content-Type': 'application/json',
        },
      }
    );
    
    if (!response.ok) {
      throw new Error(`Failed to fetch price: ${response.status}`);
    }
    
    const result = await response.json();
    const price = parseFloat(result.data?.[0]?.prices?.[0]?.value) || 1;
    
    priceCache[cacheKey] = {
      price,
      timestamp: Date.now(),
    };
    
    return {
      usd: price,
      usd_24h_change: 0,
      usd_market_cap: 0,
    };
  } catch (error) {
    logger.error('Error fetching USDT price', error as Error);
    return {
      usd: cached?.price || 1,
      usd_24h_change: 0,
      usd_market_cap: 0,
    };
  }
}

/**
 * Get prices for multiple tokens from Alchemy Prices API
 */
export async function getTokenPrices(symbols: string[]): Promise<Record<string, PriceData>> {
  const symbolsParam = symbols.map(s => SYMBOL_MAP[s] || s).join(',');
  
  try {
    if (!ALCHEMY_API_KEY) return {};
    const response = await fetch(
      `${ALCHEMY_PRICES_API}/tokens/by-symbol?symbols=${symbolsParam}`,
      {
        headers: {
          'Authorization': `Bearer ${ALCHEMY_API_KEY}`,
          'Content-Type': 'application/json',
        },
      }
    );
    
    if (!response.ok) {
      throw new Error(`Failed to fetch prices: ${response.status}`);
    }
    
    const result = await response.json();
    const priceData = result.data || [];
    const prices: Record<string, PriceData> = {};
    
    for (const token of priceData) {
      if (token.prices && token.prices.length > 0) {
        prices[token.symbol] = {
          usd: parseFloat(token.prices[0].value) || 0,
          usd_24h_change: 0,
          usd_market_cap: 0,
        };
      }
    }
    
    return prices;
  } catch (error) {
    logger.error('Error fetching token prices', error as Error);
    return {};
  }
}

/**
 * Convert USDT amount to USD value
 */
export async function usdtToUSD(usdtAmount: number): Promise<number> {
  const price = await getUSDTPrice();
  return usdtAmount * price.usd;
}

/**
 * Convert USD amount to USDT amount
 */
export async function usdToUSDT(usdAmount: number): Promise<number> {
  const price = await getUSDTPrice();
  return usdAmount / price.usd;
}

/**
 * Format currency value
 */
export function formatCurrency(value: number, decimals: number = 2): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value);
}

/**
 * Format large numbers (e.g., market cap)
 */
export function formatLargeNumber(value: number): string {
  if (value >= 1e12) {
    return `$${(value / 1e12).toFixed(2)}T`;
  }
  if (value >= 1e9) {
    return `$${(value / 1e9).toFixed(2)}B`;
  }
  if (value >= 1e6) {
    return `$${(value / 1e6).toFixed(2)}M`;
  }
  if (value >= 1e3) {
    return `$${(value / 1e3).toFixed(2)}K`;
  }
  return `$${value.toFixed(2)}`;
}

// Supported tokens for price lookup
export const SUPPORTED_TOKENS = {
  tether: 'USDT',
  bitcoin: 'BTC',
  ethereum: 'ETH',
  'binancecoin': 'BNB',
  'solana': 'SOL',
  'tron': 'TRX',
  'cardano': 'ADA',
  'ripple': 'XRP',
  'polkadot': 'DOT',
  'dogecoin': 'DOGE',
};
