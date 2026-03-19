/**
 * BlackPayments Wallet - Chain Configurations
 * 
 * Pre-configured chain settings for multi-chain USDT support
 * Uses GetBlock RPC endpoints by default
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
function getGetBlockRpcUrl(chain: WalletChain, isTestnet: boolean): string {
  const network = isTestnet ? 'testnet' : 'mainnet';
  const path = isTestnet ? 'testnet' : 'mainnet';
  
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
};

/**
 * Chain configurations for EVM networks
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
    rpcUrl: 'https://api.trongrid.io',
    explorerUrl: 'https://tronscan.org',
  },
};

/**
 * Testnet configurations
 */
export const TESTNET_CONFIGS: Record<WalletChain, ChainConfig> = {
  [WalletChain.ETHEREUM]: {
    chainId: 11155111,
    name: 'Ethereum Sepolia',
    symbol: 'ETH',
    rpcUrl: 'https://sepolia.drpc.org',
    explorerUrl: 'https://sepolia.etherscan.io',
    isTestnet: true,
  },
  [WalletChain.POLYGON]: {
    chainId: 80002,
    name: 'Polygon Amoy',
    symbol: 'MATIC',
    rpcUrl: 'https://rpc-amoy.polygon.technology',
    explorerUrl: 'https://amoy.polygonscan.com',
    isTestnet: true,
  },
  [WalletChain.BSC]: {
    chainId: 97,
    name: 'BSC Testnet',
    symbol: 'BNB',
    rpcUrl: 'https://data-seed-prebsc-1-s1.bnbchain.org:8545',
    explorerUrl: 'https://testnet.bscscan.com',
    isTestnet: true,
  },
  [WalletChain.ARBITRUM]: {
    chainId: 421614,
    name: 'Arbitrum Sepolia',
    symbol: 'ETH',
    rpcUrl: 'https://sepolia-rollup.arbitrum.io/rpc',
    explorerUrl: 'https://sepolia.arbiscan.io',
    isTestnet: true,
  },
  [WalletChain.OPTIMISM]: {
    chainId: 11155420,
    name: 'Optimism Sepolia',
    symbol: 'ETH',
    rpcUrl: 'https://sepolia.optimism.io',
    explorerUrl: 'https://sepolia-optimism.etherscan.io',
    isTestnet: true,
  },
  [WalletChain.AVALANCHE]: {
    chainId: 43113,
    name: 'Avalanche Fuji',
    symbol: 'AVAX',
    rpcUrl: 'https://api.avax-test.network/ext/bc/C/rpc',
    explorerUrl: 'https://testnet.snowtrace.io',
    isTestnet: true,
  },
  [WalletChain.CELO]: {
    chainId: 44787,
    name: 'Celo Alfajores',
    symbol: 'CELO',
    rpcUrl: 'https://alfajores-forno.celo-testnet.org',
    explorerUrl: 'https://alfajores.celoscan.io',
    isTestnet: true,
  },
  [WalletChain.LINEA]: {
    chainId: 59140,
    name: 'Linea Sepolia',
    symbol: 'ETH',
    rpcUrl: 'https://rpc.sepolia.linea.build',
    explorerUrl: 'https://sepolia.lineascan.build',
    isTestnet: true,
  },
  [WalletChain.BASE]: {
    chainId: 84532,
    name: 'Base Sepolia',
    symbol: 'ETH',
    rpcUrl: 'https://sepolia.base.org',
    explorerUrl: 'https://sepolia.basescan.org',
    isTestnet: true,
  },
  [WalletChain.TRON]: {
    chainId: 0x000000002, // Tron Nile testnet
    name: 'Tron Nile Testnet',
    symbol: 'TRX',
    rpcUrl: 'https://api.nileex.io',
    explorerUrl: 'https://nile.tronscan.org',
    isTestnet: true,
  },
};

/**
 * Get all supported chains
 */
export function getSupportedChains(): WalletChain[] {
  return Object.values(WalletChain);
}

/**
 * Get chain config by chain type
 */
export function getChainConfig(chain: WalletChain, isTestnet = false): ChainConfig {
  const baseConfig = isTestnet ? TESTNET_CONFIGS[chain] : CHAIN_CONFIGS[chain];
  
  // Try to use GetBlock if API key is configured
  const getBlockRpc = getGetBlockRpcUrl(chain, isTestnet);
  
  return {
    ...baseConfig,
    rpcUrl: getBlockRpc || baseConfig.rpcUrl,
  };
}

/**
 * Get USDT token config by chain
 */
export function getUSDTConfig(chain: WalletChain): USDTTokenConfig {
  return USDT_TOKENS[chain];
}
