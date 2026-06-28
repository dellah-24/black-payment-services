/**
 * BlackPayments Wallet - Chain Configurations
 * 
 * Pre-configured chain settings for multi-chain USDT support
 * Production-only mainnet configurations
 */

import { WalletChain, ChainConfig, USDTTokenConfig } from './types';

// GetBlock API configuration
let getBlockApiKey: string | undefined;

/**
 * Set GetBlock API key
 */
export function setGetBlockApiKey(apiKey: string): void {
  getBlockApiKey = apiKey;
}

/**
 * Get GetBlock RPC URL for a chain
 */
function getGetBlockRpcUrl(chain: WalletChain): string {
  const path = 'mainnet';
  
  if (!getBlockApiKey) {
    // Fallback to public RPCs if no API key
    return '';
  }
  
  const chainEndpoints: Record<WalletChain, string> = {
    [WalletChain.ETHEREUM]: `https://eth.getblock.io/${getBlockApiKey}/${path}/`,
    [WalletChain.POLYGON]: `https://polygon.getblock.io/${getBlockApiKey}/${path}/`,
    [WalletChain.BSC]: `https://bsc.getblock.io/${getBlockApiKey}/${path}/`,
    [WalletChain.ARBITRUM]: `https://arbitrum.getblock.io/${getBlockApiKey}/${path}/`,
    [WalletChain.OPTIMISM]: `https://optimism.getblock.io/${getBlockApiKey}/${path}/`,
    [WalletChain.AVALANCHE]: `https://avax.getblock.io/${getBlockApiKey}/${path}/`,
    [WalletChain.CELO]: `https://celo.getblock.io/${getBlockApiKey}/${path}/`,
    [WalletChain.LINEA]: `https://linea.getblock.io/${getBlockApiKey}/${path}/`,
    [WalletChain.BASE]: `https://base.getblock.io/${getBlockApiKey}/${path}/`,
    [WalletChain.TRON]: `https://tron.getblock.io/${getBlockApiKey}/${path}/`,
    [WalletChain.SOLANA]: `https://solana.getblock.io/${getBlockApiKey}/${path}/`,
    [WalletChain.BITCOIN]: `https://bitcoin.getblock.io/${getBlockApiKey}/${path}/`,
    [WalletChain.COSMOS]: `https://cosmos.getblock.io/${getBlockApiKey}/${path}/`,
    [WalletChain.TON]: `https://ton.getblock.io/${getBlockApiKey}/${path}/`,
    [WalletChain.APTOS]: `https://aptos.getblock.io/${getBlockApiKey}/${path}/`,
  };
  
  return chainEndpoints[chain] || '';
}

/**
 * Check if GetBlock is configured
 */
export function isGetBlockConfigured(): boolean {
  return !!getBlockApiKey;
}

/**
 * USDT token addresses on different EVM chains
 */
export const USDT_TOKENS: Record<WalletChain, USDTTokenConfig> = {
  [WalletChain.ETHEREUM]: {
    chain: WalletChain.ETHEREUM,
    tokenAddress: '0xdAC17F958D2ee523a2206206994597C13D831ec7',
    decimals: 6,
    name: 'Tether USD',
    symbol: 'USDT',
  },
  [WalletChain.POLYGON]: {
    chain: WalletChain.POLYGON,
    tokenAddress: '0xc2132D05D31c914a87C6611C10748AEb04B58e8F',
    decimals: 6,
    name: 'Tether USD',
    symbol: 'USDT',
  },
  [WalletChain.BSC]: {
    chain: WalletChain.BSC,
    tokenAddress: '0x55d398326f99059fF775485246999027B3197955',
    decimals: 18,
    name: 'Tether USD',
    symbol: 'USDT',
  },
  [WalletChain.ARBITRUM]: {
    chain: WalletChain.ARBITRUM,
    tokenAddress: '0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9',
    decimals: 6,
    name: 'Tether USD',
    symbol: 'USDT',
  },
  [WalletChain.OPTIMISM]: {
    chain: WalletChain.OPTIMISM,
    tokenAddress: '0x94b008aA5d2057d2D4C21e4D8dDAc6E9D48e6b7F',
    decimals: 6,
    name: 'Tether USD',
    symbol: 'USDT',
  },
  [WalletChain.AVALANCHE]: {
    chain: WalletChain.AVALANCHE,
    tokenAddress: '0x9702230A8Ea53601f5cD2dc4fD0C8c5a4d8C9e8A',
    decimals: 6,
    name: 'Tether USD',
    symbol: 'USDT',
  },
  [WalletChain.CELO]: {
    chain: WalletChain.CELO,
    tokenAddress: '0xB4FB3D6f08Ac2dC83F9d8d44B9d4aB92C4f2E7e6',
    decimals: 6,
    name: 'Tether USD',
    symbol: 'USDT',
  },
  [WalletChain.LINEA]: {
    chain: WalletChain.LINEA,
    tokenAddress: '0xA219439258ca9da29E9Cc4cE55996b71d8B417e6',
    decimals: 6,
    name: 'Tether USD',
    symbol: 'USDT',
  },
  [WalletChain.BASE]: {
    chain: WalletChain.BASE,
    tokenAddress: '0x833589fCD6eDb6E08f4c7C32D4f71B54bdA02913',
    decimals: 6,
    name: 'Tether USD',
    symbol: 'USDT',
  },
  [WalletChain.TRON]: {
    chain: WalletChain.TRON,
    tokenAddress: 'TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t', // TRC-20 USDT contract
    decimals: 6,
    name: 'Tether USD (TRC-20)',
    symbol: 'USDT',
  },
  [WalletChain.SOLANA]: {
    chain: WalletChain.SOLANA,
    tokenAddress: 'Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB', // USDT on Solana
    decimals: 6,
    name: 'Tether USD (SPL)',
    symbol: 'USDT',
  },
  [WalletChain.BITCOIN]: {
    chain: WalletChain.BITCOIN,
    tokenAddress: '',
    decimals: 0,
    name: 'Tether USD (Omni)',
    symbol: 'USDT',
  },
  [WalletChain.COSMOS]: {
    chain: WalletChain.COSMOS,
    tokenAddress: '',
    decimals: 6,
    name: 'Tether USD (Cosmos)',
    symbol: 'USDT',
  },
  [WalletChain.TON]: {
    chain: WalletChain.TON,
    tokenAddress: '',
    decimals: 6,
    name: 'Tether USD (TON)',
    symbol: 'USDT',
  },
  [WalletChain.APTOS]: {
    chain: WalletChain.APTOS,
    tokenAddress: '',
    decimals: 6,
    name: 'Tether USD (Aptos)',
    symbol: 'USDT',
  },
};

/**
 * Chain configurations for EVM networks - Production mainnet only
 */
export const CHAIN_CONFIGS: Record<WalletChain, ChainConfig> = {
  [WalletChain.ETHEREUM]: {
    chainId: 1,
    name: 'Ethereum',
    symbol: 'ETH',
    rpcUrl: 'https://eth.drpc.org',
    explorerUrl: 'https://etherscan.io',
  },
  [WalletChain.POLYGON]: {
    chainId: 137,
    name: 'Polygon',
    symbol: 'MATIC',
    rpcUrl: 'https://polygon-rpc.com',
    explorerUrl: 'https://polygonscan.com',
  },
  [WalletChain.BSC]: {
    chainId: 56,
    name: 'BNB Smart Chain',
    symbol: 'BNB',
    rpcUrl: 'https://bsc-dataseed.binance.org',
    explorerUrl: 'https://bscscan.com',
  },
  [WalletChain.ARBITRUM]: {
    chainId: 42161,
    name: 'Arbitrum One',
    symbol: 'ETH',
    rpcUrl: 'https://arb1.arbitrum.io/rpc',
    explorerUrl: 'https://arbiscan.io',
  },
  [WalletChain.OPTIMISM]: {
    chainId: 10,
    name: 'Optimism',
    symbol: 'ETH',
    rpcUrl: 'https://mainnet.optimism.io',
    explorerUrl: 'https://optimistic.etherscan.io',
  },
  [WalletChain.AVALANCHE]: {
    chainId: 43114,
    name: 'Avalanche C-Chain',
    symbol: 'AVAX',
    rpcUrl: 'https://api.avax.network/ext/bc/C/rpc',
    explorerUrl: 'https://snowtrace.io',
  },
  [WalletChain.CELO]: {
    chainId: 42220,
    name: 'Celo',
    symbol: 'CELO',
    rpcUrl: 'https://forno.celo.org',
    explorerUrl: 'https://explorer.celo.org',
  },
  [WalletChain.LINEA]: {
    chainId: 59144,
    name: 'Linea',
    symbol: 'ETH',
    rpcUrl: 'https://rpc.linea.build',
    explorerUrl: 'https://lineascan.build',
  },
  [WalletChain.BASE]: {
    chainId: 8453,
    name: 'Base',
    symbol: 'ETH',
    rpcUrl: 'https://mainnet.base.org',
    explorerUrl: 'https://basescan.org',
  },
  [WalletChain.TRON]: {
    chainId: 0x000000001, // Tron chain ID (network)
    name: 'Tron',
    symbol: 'TRX',
    rpcUrl: 'https://api.trongrid.io/',
    explorerUrl: 'https://tronscan.org',
  },
  [WalletChain.SOLANA]: {
    chainId: 0, // Solana uses different chain ID scheme
    name: 'Solana',
    symbol: 'SOL',
    rpcUrl: 'https://api.mainnet-beta.solana.com',
    explorerUrl: 'https://solscan.io',
  },
  [WalletChain.BITCOIN]: {
    chainId: 0, // Bitcoin uses different chain ID scheme
    name: 'Bitcoin',
    symbol: 'BTC',
    rpcUrl: 'https://blockstream.info/api',
    explorerUrl: 'https://blockstream.info',
  },
  [WalletChain.COSMOS]: {
    chainId: 0, // Cosmos uses different chain ID scheme
    name: 'Cosmos',
    symbol: 'ATOM',
    rpcUrl: 'https://cosmos-rpc.publicnode.com',
    explorerUrl: 'https://mintscan.io/cosmos',
  },
  [WalletChain.TON]: {
    chainId: 0, // TON uses different chain ID scheme
    name: 'TON',
    symbol: 'TON',
    rpcUrl: 'https://toncenter.com/api/v2/jsonRPC',
    explorerUrl: 'https://tonscan.org',
  },
  [WalletChain.APTOS]: {
    chainId: 0, // Aptos uses different chain ID scheme
    name: 'Aptos',
    symbol: 'APT',
    rpcUrl: 'https://fullnode.mainnet.aptoslabs.com/v1',
    explorerUrl: 'https://aptoscan.com',
  },
};

/**
 * Get all supported chains
 */
export function getSupportedChains(): WalletChain[] {
  return Object.values(WalletChain);
}

/**
 * Get chain config
 */
export function getChainConfig(chain: WalletChain): ChainConfig {
  return CHAIN_CONFIGS[chain];
}

/**
 * Get USDT token config by chain
 */
export function getUSDTConfig(chain: WalletChain): USDTTokenConfig {
  return USDT_TOKENS[chain];
}
