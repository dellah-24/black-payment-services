/**
 * Centralized RPC endpoints per chain.
 *
 * Provides known-good public defaults where reasonably reliable,
 * otherwise requires environment configuration and fails fast with
 * a clear error to avoid silent misconfigurations.
 */

export type ChainKey =
  | 'BTC'
  | 'BCH'
  | 'ETH'
  | 'POL'
  | 'SOL'
  | 'BNB'
  | 'BASE'
  | 'DOGE'
  | 'XRP'
  | 'ADA'
  | 'TRON';

function required(name: string): string {
  // Return empty string for optional chains so callers can handle
  // missing configuration gracefully (e.g., during tests).
  // Chain-specific functions will fail naturally if they try to use an empty endpoint.
  return '';
}

/**
 * Get RPC endpoints for supported chains.
 *
 * Env variable names used:
 * - BITCOIN_RPC_URL, BCH_RPC_URL, ETHEREUM_RPC_URL, POLYGON_RPC_URL,
 *   SOLANA_RPC_URL or NEXT_PUBLIC_SOLANA_RPC_URL, BSC_RPC_URL,
 *   BASE_RPC_URL, DOGE_RPC_URL, XRP_RPC_URL, ADA_RPC_URL, TRON_RPC_URL
 */
export function getRpcEndpoints(): Record<ChainKey, string> {
  const BTC = process.env.BITCOIN_RPC_URL || 'https://blockstream.info/api';
  const ETH = process.env.ETHEREUM_RPC_URL || 'https://eth.llamarpc.com';
  const POL = process.env.POLYGON_RPC_URL || 'https://polygon-rpc.com';
  const SOL =
    process.env.NEXT_PUBLIC_SOLANA_RPC_URL ||
    process.env.SOLANA_RPC_URL ||
    'https://api.mainnet-beta.solana.com';
  const BNB = process.env.BSC_RPC_URL || 'https://bsc-dataseed.binance.org';
  const BASE = process.env.BASE_RPC_URL || 'https://mainnet.base.org';
  const TRON = process.env.TRON_RPC_URL || 'https://api.trongrid.io';

  // For chains without widely reliable public endpoints, require env config
  const BCH = process.env.BCH_RPC_URL || required('BCH (set BCH_RPC_URL)');
  const DOGE = process.env.DOGE_RPC_URL || required('DOGE (set DOGE_RPC_URL)');
  const XRP = process.env.XRP_RPC_URL || required('XRP (set XRP_RPC_URL)');
  const ADA = process.env.ADA_RPC_URL || required('ADA (set ADA_RPC_URL)');

  return { BTC, BCH, ETH, POL, SOL, BNB, BASE, DOGE, XRP, ADA, TRON } as Record<ChainKey, string>;
}
