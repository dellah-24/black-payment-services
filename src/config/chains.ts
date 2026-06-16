/**
 * Shared Chain Configuration
 * Consolidated from multiple sources for single source of truth
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
  isTestnet?: boolean;
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
 * Testnet Chain Configurations
 * Used for development and testing
 */
export const TESTNET_CHAINS: Record<ChainKey, ChainConfig> = {
  ethereum: {
    name: 'Ethereum Sepolia',
    symbol: 'ETH',
    rpcUrls: [
      'https://eth-sepolia.g.alchemy.com/v2/demo',
      'https://rpc.sepolia.org',
      'https://eth-sepolia.publicnode.com'
    ],
    explorerUrl: 'https://sepolia.etherscan.io',
    chainId: 11155111,
    usdtAddress: '0xaA8E23fb10225F21FEF27844aeEEBC3b6F8D3d8e',
    isTestnet: true,
    color: '#627EEA',
  },
  bsc: {
    name: 'BNB Chain Testnet',
    symbol: 'BNB',
    rpcUrls: [
      'https://data-seed-prebsc-1-s1.bnbchain.org:8545',
      'https://testnet-bsc.nodereal.io'
    ],
    explorerUrl: 'https://testnet.bscscan.com',
    chainId: 97,
    usdtAddress: '0x7d87123dC52A4A4A7F1d4d4C5d4B5d4C5d4B5d4C',
    isTestnet: true,
    color: '#F3BA2F',
  },
  polygon: {
    name: 'Polygon Amoy',
    symbol: 'MATIC',
    rpcUrls: [
      'https://rpc-amoy.polygon.technology',
      'https://polygon-amoy.blockpi.network/v1/rpc/public'
    ],
    explorerUrl: 'https://amoy.polygonscan.com',
    chainId: 80002,
    usdtAddress: '0x534c3937A1b8A4D4C4b4C5D4C5d4C5D4C5d4C5D',
    isTestnet: true,
    color: '#8247E5',
  },
  arbitrum: {
    name: 'Arbitrum Sepolia',
    symbol: 'ETH',
    rpcUrls: [
      'https://sepolia.arbitrum.io/rpc',
      'https://arbitrum-sepolia.drpc.org'
    ],
    explorerUrl: 'https://sepolia.arbiscan.io',
    chainId: 421614,
    usdtAddress: '0x8b99F9C5bCd7D4C5d4C5D4C5d4C5D4C5d4C5D4',
    isTestnet: true,
    color: '#28A0F0',
  },
  optimism: {
    name: 'Optimism Sepolia',
    symbol: 'ETH',
    rpcUrls: [
      'https://sepolia.optimism.io',
      'https://optimism-sepolia.drpc.org'
    ],
    explorerUrl: 'https://sepolia-optimistic.etherscan.io',
    chainId: 11155420,
    usdtAddress: '0x9c4C9C5d4C5D4C5D4C5D4C5d4C5D4C5d4C5D',
    isTestnet: true,
    color: '#FF0420',
  },
  avalanche: {
    name: 'Avalanche Fuji',
    symbol: 'AVAX',
    rpcUrls: [
      'https://api.avax-test.network/ext/bc/C/rpc',
      'https://ava-c02d43c5-3518-4d9e-b13d-8bd8bf45a9bb-x:8090/ext/bc/C/rpc'
    ],
    explorerUrl: 'https://testnet.snowtrace.io',
    chainId: 43113,
    usdtAddress: '0xD4C5C4d4C5D4C5D4C5D4C5d4C5D4C5d4C5D',
    isTestnet: true,
    color: '#E84142',
  },
  tron: {
    name: 'TRON Nile Testnet',
    symbol: 'TRX',
    rpcUrls: [
      'https://nile.trongrid.io',
      'https://api.nileex.io'
    ],
    explorerUrl: 'https://nile.tronscan.org',
    chainId: 3448148188,
    usdtAddress: 'TDyWzKdd4r3hK1P4K4P4K4P4K4P4K4P4K4P4',
    isTestnet: true,
    color: '#FF0013',
  },
  celo: {
    name: 'Celo Alfajores',
    symbol: 'CELO',
    rpcUrls: [
      'https://alfajores-forno.celo-testnet.org',
      'https://celo-alfajores-rpc.allthatnode.com'
    ],
    explorerUrl: 'https://alfajores.celoscan.io',
    chainId: 44787,
    usdtAddress: '0xB4FB3D6f08Ac2dC83F9d8d44B9d4aB92C4f2E7e6',
    isTestnet: true,
    color: '#35D07F',
  },
  linea: {
    name: 'Linea Sepolia',
    symbol: 'ETH',
    rpcUrls: [
      'https://rpc.sepolia.linea.build',
      'https://linea-sepolia.drpc.org'
    ],
    explorerUrl: 'https://sepolia.lineascan.build',
    chainId: 59141,
    usdtAddress: '0xE4C4C4d4C5D4C5D4C5D4C5d4C5D4C5d4C5D',
    isTestnet: true,
    color: '#121212',
  },
  base: {
    name: 'Base Sepolia',
    symbol: 'ETH',
    rpcUrls: [
      'https://sepolia.base.org',
      'https://base-sepolia.drpc.org'
    ],
    explorerUrl: 'https://sepolia.basescan.org',
    chainId: 84532,
    usdtAddress: '0xF4C4C4d4C5D4C5D4C5D4C5d4C5D4C5d4C5D',
    isTestnet: true,
    color: '#0052FF',
  },
  solana: {
    name: 'Solana Devnet',
    symbol: 'SOL',
    rpcUrls: [
      'https://api.devnet.solana.com',
      'https://solana-devnet-rpc.allthatnode.com'
    ],
    explorerUrl: 'https://solscan.io?cluster=devnet',
    chainId: 103,
    usdtAddress: '',
    isTestnet: true,
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
 * Get chain config for active chain (supports both mainnet and testnet)
 */
export function getActiveChainConfig(chain: ChainKey, isTestnet?: boolean): ChainConfig {
  if (isTestnet) {
    return TESTNET_CHAINS[chain] || TESTNET_CHAINS.ethereum;
  }
  return getChainConfig(chain);
}

/**
 * Get all supported chain keys
 */
export function getSupportedChains(): ChainKey[] {
  return Object.keys(CHAINS) as ChainKey[];
}

/**
 * Get all supported testnet chain keys
 */
export function getSupportedTestnetChains(): ChainKey[] {
  return Object.keys(TESTNET_CHAINS) as ChainKey[];
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
  // Also check testnets
  for (const [key, config] of Object.entries(TESTNET_CHAINS)) {
    if (config.chainId === chainId) {
      return key as ChainKey;
    }
  }
  return undefined;
}

/**
 * Get primary RPC URL (first in the list)
 */
export function getPrimaryRpcUrl(chain: ChainKey, isTestnet?: boolean): string {
  const config = getActiveChainConfig(chain, isTestnet);
  return config.rpcUrls[0];
}

/**
 * Get all RPC URLs for failover
 */
export function getRpcUrls(chain: ChainKey, isTestnet?: boolean): string[] {
  const config = getActiveChainConfig(chain, isTestnet);
  return config?.rpcUrls || [];
}

/**
 * Get USDT address for a chain (mainnet or testnet)
 */
export function getUsdtAddress(chain: ChainKey, isTestnet?: boolean): string {
  const config = getActiveChainConfig(chain, isTestnet);
  return config.usdtAddress;
}

export default CHAINS;
