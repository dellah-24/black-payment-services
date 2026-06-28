/**
 * Shared Chain Configuration
 * Consolidated from multiple sources for single source of truth
 * Production-only mainnet configurations
 */

import { getEnv } from '@/lib/env';

export type ChainKey = 'tron' | 'ethereum' | 'bsc' | 'polygon' | 'arbitrum' | 'optimism' | 'avalanche' | 'celo' | 'linea' | 'base' | 'solana';

export interface ChainConfig {
  name: string;
  symbol: string;
  rpcUrls: string[];
  explorerUrl: string;
  chainId: number;
  usdtAddress: string;
  color?: string;
}

function requirePublicRpc(envName: string, fallback: string): string {
  const value = getEnv(envName);
  return value || fallback;
}

function getAlchemyRpc(chain: string): string | undefined {
  const apiKey = getEnv('NEXT_PUBLIC_ALCHEMY_API_KEY');
  if (!apiKey) return undefined;
  return `https://${chain}-mainnet.g.alchemy.com/v2/${apiKey}`;
}

function mainnetRpcUrls(primary: string, fallbacks: string[]): string[] {
  return [primary, ...fallbacks.filter((fallback) => fallback !== primary)];
}

export const CHAINS: Record<ChainKey, ChainConfig> = {
  tron: {
    name: 'TRON',
    symbol: 'TRX',
    rpcUrls: [
      requirePublicRpc('NEXT_PUBLIC_TRON_RPC', 'https://api.trongrid.io/'),
      'https://rpc.ankr.com/tron/'
    ],
    explorerUrl: 'https://tronscan.org',
    chainId: 728126583,
    usdtAddress: 'TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t',
    color: '#FF0013',
  },
  ethereum: {
    name: 'Ethereum',
    symbol: 'ETH',
    rpcUrls: [
      getAlchemyRpc('eth') || requirePublicRpc('NEXT_PUBLIC_ETHEREUM_RPC', 'https://cloudflare-eth.com'),
      'https://eth.drpc.org',
      'https://rpc.ankr.com/eth'
    ],
    explorerUrl: 'https://etherscan.io',
    chainId: 1,
    usdtAddress: '0xdAC17F958D2ee523a2206206994597C13D831ec7',
    color: '#627EEA',
  },
  bsc: {
    name: 'BNB Chain',
    symbol: 'BNB',
    rpcUrls: [
      getAlchemyRpc('bsc') || requirePublicRpc('NEXT_PUBLIC_BSC_RPC', 'https://bsc-dataseed1.binance.org'),
      'https://bsc-dataseed.binance.org',
      'https://rpc.ankr.com/bsc'
    ],
    explorerUrl: 'https://bscscan.com',
    chainId: 56,
    usdtAddress: '0x55d398326f99059fF775485246999027B3197955',
    color: '#F3BA2F',
  },
  polygon: {
    name: 'Polygon',
    symbol: 'MATIC',
    rpcUrls: mainnetRpcUrls(requirePublicRpc('NEXT_PUBLIC_POLYGON_RPC', 'https://polygon-rpc.com'), ['https://rpc.ankr.com/polygon']),
    explorerUrl: 'https://polygonscan.com',
    chainId: 137,
    usdtAddress: '0xc2132D05D31c914a87C6611C10748AEb04B58e8F',
    color: '#8247E5',
  },
  arbitrum: {
    name: 'Arbitrum One',
    symbol: 'ETH',
    rpcUrls: [
      getAlchemyRpc('arb') || requirePublicRpc('NEXT_PUBLIC_ARBITRUM_RPC', 'https://arb1.arbitrum.io/rpc'),
      'https://rpc.ankr.com/arbitrum'
    ],
    explorerUrl: 'https://arbiscan.io',
    chainId: 42161,
    usdtAddress: '0xFd086bC7CD5C481DCC93C85BD42c402bDe6B9614',
    color: '#28A0F0',
  },
  optimism: {
    name: 'Optimism',
    symbol: 'ETH',
    rpcUrls: [
      getAlchemyRpc('opt') || requirePublicRpc('NEXT_PUBLIC_OPTIMISM_RPC', 'https://mainnet.optimism.io'),
      'https://rpc.ankr.com/optimism'
    ],
    explorerUrl: 'https://optimistic.etherscan.io',
    chainId: 10,
    usdtAddress: '0x94b008aA5d2057d2D4C21e4D8dDAc6E9D48e6b7F',
    color: '#FF0420',
  },
  avalanche: {
    name: 'Avalanche C-Chain',
    symbol: 'AVAX',
    rpcUrls: mainnetRpcUrls(requirePublicRpc('NEXT_PUBLIC_AVALANCHE_RPC', 'https://api.avax.network/ext/bc/C/rpc'), ['https://rpc.ankr.com/avalanche']),
    explorerUrl: 'https://snowtrace.io',
    chainId: 43114,
    usdtAddress: '0x9702230A8Ea53601f5cD2dc4fD0C8c5a4d8C9e8A',
    color: '#E84142',
  },
  celo: {
    name: 'Celo',
    symbol: 'CELO',
    rpcUrls: mainnetRpcUrls(requirePublicRpc('NEXT_PUBLIC_CELO_RPC', 'https://forno.celo.org'), ['https://rpc.ankr.com/celo']),
    explorerUrl: 'https://explorer.celo.org',
    chainId: 42220,
    usdtAddress: '0xB4FB3D6f08Ac2dC83F9d8d44B9d4aB92C4f2E7e6',
    color: '#35D07F',
  },
  linea: {
    name: 'Linea',
    symbol: 'ETH',
    rpcUrls: mainnetRpcUrls(requirePublicRpc('NEXT_PUBLIC_LINEA_RPC', 'https://rpc.linea.build'), ['https://rpc.ankr.com/linea']),
    explorerUrl: 'https://lineascan.build',
    chainId: 59144,
    usdtAddress: '0xA219439258ca9da29E9Cc4cE55996b71d8B417e6',
    color: '#121212',
  },
  base: {
    name: 'Base',
    symbol: 'ETH',
    rpcUrls: mainnetRpcUrls(requirePublicRpc('NEXT_PUBLIC_BASE_RPC', 'https://mainnet.base.org'), ['https://rpc.ankr.com/base']),
    explorerUrl: 'https://basescan.org',
    chainId: 8453,
    usdtAddress: '0x833589fCD6eDb6E08f4c7C32D4f71B54bdA02913',
    color: '#0052FF',
  },
  solana: {
    name: 'Solana',
    symbol: 'SOL',
    rpcUrls: mainnetRpcUrls(requirePublicRpc('NEXT_PUBLIC_SOLANA_RPC', 'https://api.mainnet-beta.solana.com'), ['https://rpc.ankr.com/solana']),
    explorerUrl: 'https://solscan.io',
    chainId: 0,
    usdtAddress: '',
    color: '#14F195',
  },
};

/**
 * Get chain config by key
 */
export function getChainConfig(chain: ChainKey): ChainConfig {
  return CHAINS[chain] || CHAINS.ethereum;
}

/**
 * Get all supported chain keys
 */
export function getSupportedChains(): ChainKey[] {
  return Object.keys(CHAINS) as ChainKey[];
}

/**
 * Get chain by chain ID
 */
export function getChainById(chainId: number): ChainKey | undefined {
  for (const [key, config] of Object.entries(CHAINS)) {
    if (config.chainId === chainId) {
      return key as ChainKey;
    }
  }
  return undefined;
}

/**
 * Get primary RPC URL (first in the list)
 */
export function getPrimaryRpcUrl(chain: ChainKey): string {
  return CHAINS[chain]?.rpcUrls[0] || '';
}

/**
 * Get all RPC URLs for failover
 */
export function getRpcUrls(chain: ChainKey): string[] {
  return CHAINS[chain]?.rpcUrls || [];
}

/**
 * Get USDT address for a chain
 */
export function getUsdtAddress(chain: ChainKey): string {
  return CHAINS[chain]?.usdtAddress || '';
}

export default CHAINS;
