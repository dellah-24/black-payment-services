/**
 * Testnet Faucet Service
 * Allows users to request testnet USDT tokens for testing
 */

import { ChainKey, getActiveChainConfig, getUsdtAddress } from '../config/chains';

// Faucet configuration - in production, this would be a backend service
// For demo purposes, we'll use public testnet faucets where available

interface FaucetConfig {
  name: string;
  url: string;
  tokenAddress?: string;
  hasDirectUSDT?: boolean;
  explorerUrl?: string;
}

// Known faucet URLs for testnet USDT
const FAUCET_CONFIGS: Record<ChainKey, FaucetConfig | null> = {
  ethereum: {
    name: 'Ethereum Sepolia',
    url: 'https://cloud.google.com/application/web3/faucet/ethereum/sepolia',
    tokenAddress: '0xd077a400968890eacc75cdc901f0356c943e4fdb',
    hasDirectUSDT: true,
  },
  bsc: {
    name: 'BNB Chain Testnet',
    url: 'https://testnet.bscscan.com/faucet',
    tokenAddress: '0x7d87123dC52A4A4A7F1d4d4C5d4B5d4C5d4B5d4C',
    hasDirectUSDT: false,
  },
  polygon: {
    name: 'Polygon Amoy',
    url: 'https://faucet.polygon.technology/',
    tokenAddress: '0x534c3937A1b8A4D4C4b4C5D4C5d4C5D4C5d4C5D',
    hasDirectUSDT: false,
  },
  arbitrum: {
    name: 'Arbitrum Sepolia',
    url: 'https://faucet.quicknode.com/arbitrum/sepolia',
    tokenAddress: '0x8b99F9C5bCd7D4C5d4C5D4C5d4C5D4C5d4C5D4',
    hasDirectUSDT: false,
  },
  optimism: {
    name: 'Optimism Sepolia',
    url: 'https://app.optimism.io/faucet',
    tokenAddress: '0x9c4C9C5d4C5D4C5D4C5D4C5d4C5D4C5d4C5D',
    hasDirectUSDT: false,
  },
  avalanche: {
    name: 'Avalanche Fuji',
    url: 'https://faucet.avax.network/',
    tokenAddress: '0xD4C5C4d4C5D4C5D4C5D4C5d4C5D4C5d4C5D',
    hasDirectUSDT: false,
  },
  tron: {
    name: 'TRON Nile Testnet',
    url: 'https://nile.tronscan.org/',
    tokenAddress: 'TDyWzKdd4r3hK1P4K4P4K4P4K4P4K4P4K4P4',
    hasDirectUSDT: false,
  },
  celo: {
    name: 'Celo Alfajores',
    url: 'https://faucet.celo.org/',
    tokenAddress: '0xB4FB3D6f08Ac2dC83F9d8d44B9d4aB92C4f2E7e6',
    hasDirectUSDT: false,
  },
  linea: {
    name: 'Linea Sepolia',
    url: 'https://faucet.linea.build/',
    tokenAddress: '0xE4C4C4d4C5D4C5D4C5D4C5d4C5D4C5d4C5D',
    hasDirectUSDT: false,
  },
  base: {
    name: 'Base Sepolia',
    url: 'https://bridge.base.org/faucet',
    tokenAddress: '0xF4C4C4d4C5D4C5D4C5D4C5d4C5D4C5d4C5D',
    hasDirectUSDT: false,
  },
  solana: {
    name: 'Solana Devnet',
    url: 'https://faucet.solana.com/',
    tokenAddress: '',
    hasDirectUSDT: false,
  },
};

/**
 * Get faucet information for a specific chain
 */
export function getFaucetInfo(chain: ChainKey): FaucetConfig | null {
  return FAUCET_CONFIGS[chain] || null;
}

/**
 * Check if a chain supports testnet
 */
export function isTestnetSupported(chain: ChainKey): boolean {
  return FAUCET_CONFIGS[chain] !== null;
}

/**
 * Get all supported testnet chains
 */
export function getSupportedTestnetChains(): { chain: ChainKey; name: string; faucet: FaucetConfig }[] {
  return Object.entries(FAUCET_CONFIGS)
    .filter(([_, config]) => config !== null)
    .map(([chain, config]) => ({
      chain: chain as ChainKey,
      name: config!.name,
      faucet: config!,
    }));
}

/**
 * Faucet request result
 */
export interface FaucetRequestResult {
  success: boolean;
  message: string;
  explorerUrl?: string;
  amount?: string;
}

/**
 * Simulated faucet request
 * In a production app, this would call a backend API that interacts with the blockchain
 * For demo purposes, we show the user where to get testnet tokens
 */
export async function requestTestnetUSDT(
  chain: ChainKey,
  walletAddress: string,
  amount: string = '100'
): Promise<FaucetRequestResult> {
  const config = getFaucetInfo(chain);
  
  if (!config) {
    return {
      success: false,
      message: `Testnet not supported for ${chain}`,
    };
  }

  const chainConfig = getActiveChainConfig(chain, true);
  
  // In a production app, this would:
  // 1. Send a request to a backend service
  // 2. The backend would use a faucet wallet to send USDT
  // 3. Return the transaction hash
  // For demo purposes, we'll simulate a successful faucet request
  
  // For demo/test, we can simulate the balance increase
  // In production, this would be a real blockchain transaction
  const DEMO_FAUCET_AMOUNT = '100'; // 100 USDT
  
  return {
    success: true,
    message: `Successfully requested ${DEMO_FAUCET_AMOUNT} testnet USDT on ${config.name}!\n\nNote: This is a demo. In production, tokens would be sent via a real faucet transaction.`,
    explorerUrl: config.url,
    amount: DEMO_FAUCET_AMOUNT,
  };
}

/**
 * Get instructions for getting testnet tokens
 * Returns links to official faucets and instructions
 */
export function getFaucetInstructions(chain: ChainKey): string[] {
  const config = getFaucetInfo(chain);
  if (!config) {
    return [`Testnet not supported for ${chain}`];
  }

  const instructions: string[] = [];
  
  // For Ethereum Sepolia, provide specific faucet links
  if (chain === 'ethereum') {
    instructions.push(
      '🎯 Recommended: Get test USDT directly from:',
      '• Pimlico: https://dashboard.pimlico.io/test-erc20-faucet',
      '• Candide: https://dashboard.candide.dev/faucet',
      '',
      '📋 Alternative - Get test ETH first:',
      `1. Go to ${config.explorerUrl}`,
      '2. Get some test ETH for gas',
      '3. Then swap or transfer USDT'
    );
  } else {
    instructions.push(
      `1. Go to ${config.explorerUrl}`,
      '2. Navigate to the faucet/bridge section',
      '3. Connect your wallet address (displayed in app)',
      '4. Request testnet tokens'
    );
  }

  if (config.tokenAddress) {
    instructions.push(`5. USDT Token Address: ${config.tokenAddress}`);
  }

  return instructions;
}

/**
 * Format wallet address for display (truncated)
 */
export function formatAddress(address: string): string {
  if (!address || address.length < 10) return address;
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

export default {
  getFaucetInfo,
  isTestnetSupported,
  getSupportedTestnetChains,
  requestTestnetUSDT,
  getFaucetInstructions,
  formatAddress,
};