import { getEnv, isPlaceholder, isProduction } from '@/lib/env';
import { logger } from '@/lib/logger';

export interface PriceData {
  symbol: string;
  price: number;
  change24h: number;
  changePercent24h: number;
  high24h: number;
  low24h: number;
  volume24h: number;
  lastUpdated: string;
}

export interface TokenPrice {
  symbol: string;
  price: number;
  change24h: number;
  changePercent24h: number;
  high24h: number;
  low24h: number;
  volume24h: number;
  lastUpdated: string;
}

export async function getTokenPrice(symbol: string): Promise<TokenPrice | null> {
  const apiKey = getEnv('EXCHANGE_API_KEY');
  const apiUrl = getEnv('EXCHANGE_API_URL');

  if (isPlaceholder(apiKey) || isPlaceholder(apiUrl)) {
    logger.warn('Exchange API not configured, returning null price');
    return null;
  }

  try {
    const response = await fetch(`${apiUrl}/price/${symbol}`, {
      headers: {
        'X-API-Key': apiKey ?? '',
      },
      next: { revalidate: 30 },
    });

    if (!response.ok) {
      throw new Error(`Price API error: ${response.status}`);
    }

    const data = await response.json();
    return {
      symbol: data.symbol || symbol,
      price: data.price || 0,
      change24h: data.change24h || 0,
      changePercent24h: data.changePercent24h || 0,
      high24h: data.high24h || 0,
      low24h: data.low24h || 0,
      volume24h: data.volume24h || 0,
      lastUpdated: new Date().toISOString(),
    };
  } catch (error) {
    logger.error('Failed to fetch token price', error as Error);
    return null;
  }
}

export async function getMultipleTokenPrices(symbols: string[]): Promise<Record<string, TokenPrice>> {
  const prices: Record<string, TokenPrice> = {};

  for (const symbol of symbols) {
    const price = await getTokenPrice(symbol);
    if (price) {
      prices[symbol] = price;
    }
  }

  return prices;
}

export async function getUSDTPrice(): Promise<TokenPrice | null> {
  return getTokenPrice('USDT');
}

export async function getMarketData(): Promise<PriceData[]> {
  const apiKey = getEnv('EXCHANGE_API_KEY');
  const apiUrl = getEnv('EXCHANGE_API_URL');

  if (isPlaceholder(apiKey) || isPlaceholder(apiUrl)) {
    logger.warn('Exchange API not configured, returning empty market data');
    return [];
  }

  try {
    const response = await fetch(`${apiUrl}/market`, {
      headers: {
        'X-API-Key': apiKey ?? '',
      },
      next: { revalidate: 60 },
    });

    if (!response.ok) {
      throw new Error(`Market API error: ${response.status}`);
    }

    const data = await response.json();
    return (data.data || []).map((item: any) => ({
      symbol: item.symbol,
      price: item.price,
      change24h: item.change24h,
      changePercent24h: item.changePercent24h,
      high24h: item.high24h,
      low24h: item.low24h,
      volume24h: item.volume24h,
      lastUpdated: new Date().toISOString(),
    }));
  } catch (error) {
    logger.error('Failed to fetch market data', error as Error);
    return [];
  }
}

/**
 * Format a number as currency string
 */
export function formatCurrency(amount: number, currency: string = 'USD'): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
  }).format(amount);
}

/**
 * Convert USDT amount to USD value
 */
export async function usdtToUSD(usdtAmount: number): Promise<number> {
  const price = await getUSDTPrice();
  if (!price) return 0;
  return usdtAmount * price.price;
}
