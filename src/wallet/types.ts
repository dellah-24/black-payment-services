/**
 * BlackPayments Wallet - Type Definitions
 */

/**
 * Supported blockchain chains for USDT
 */
export enum WalletChain {
  ETHEREUM = 'ethereum',
  POLYGON = 'polygon',
  BSC = 'bsc', // Binance Smart Chain
  ARBITRUM = 'arbitrum',
  OPTIMISM = 'optimism',
  AVALANCHE = 'avalanche',
  CELO = 'celo',
  LINEA = 'linea',
  BASE = 'base',
  TRON = 'tron', // TRC-20 - Essential for P2P (low fees)
}

/**
 * Wallet type classification for split-custody P2P system
 */
export enum WalletType {
  HOT = 'hot',     // Online, operational wallet for daily trading
  COLD = 'cold',   // Offline, reserve wallet for long-term storage
}

/**
 * Configuration for split-custody wallet setup
 */
export interface SplitCustodyConfig {
  hotWalletConfig: {
    chains: WalletChain[];
    maxDailyVolume: bigint;      // Maximum USDT for daily operations
    replenishmentThreshold: bigint; // Auto-replenish when below this
  };
  coldWalletConfig: {
    chains: WalletChain[];
    multiSigRequired?: boolean;   // Require multiple signatures for withdrawal
    signers?: string[];           // Multi-sig signer addresses
  };
  autoReplenish?: boolean;
  rebalanceThreshold?: bigint;
}

/**
 * Transfer between hot and cold wallets
 */
export interface CustodyTransfer {
  id: string;
  fromType: WalletType;
  toType: WalletType;
  amount: bigint;
  chain: WalletChain;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  txHash?: string;
  timestamp: Date;
}

/**
 * Whitelist entry for approved withdrawal addresses
 */
export interface WhitelistEntry {
  address: string;
  label: string;
  chain: WalletChain;
  maxWithdrawal?: bigint;
  dailyLimit?: bigint;
  createdAt: Date;
}

/**
 * Multi-sig transaction request
 */
export interface MultiSigRequest {
  id: string;
  to: string;
  amount: bigint;
  chain: WalletChain;
  signatures: string[];
  requiredSignatures: number;
  status: 'pending' | 'approved' | 'rejected' | 'executed';
  createdAt: Date;
  executedAt?: Date;
}

/**
 * Escrow terms for P2P trading
 */
export interface EscrowTerms {
  id: string;
  seller: string;
  buyer: string;
  amount: bigint;
  chain: WalletChain;
  price: bigint; // Price per USDT in wei
  timeout: number; // Unix timestamp
  token: string; // USDT contract address
  currency: string; // Payment currency
}

/**
 * Escrow state
 */
export interface EscrowState {
  id: string;
  terms: EscrowTerms;
  status: 'created' | 'funded' | 'released' | 'refunded' | 'disputed';
  fundedAt?: number;
  releasedAt?: number;
  refundedAt?: number;
  disputedAt?: number;
  moderator?: string;
  disputeReason?: string;
}

/**
 * Dispute evidence
 */
export interface DisputeEvidence {
  escrowId: string;
  submittedBy: string; // 'buyer' or 'seller'
  evidence: string; // IPFS hash or URL
  timestamp: number;
}

/**
 * Chain configuration for EVM networks
 */
export interface ChainConfig {
  chainId: number;
  name: string;
  symbol: string;
  rpcUrl: string;
  explorerUrl: string;
  isTestnet?: boolean;
}

/**
 * USDT token configuration for different chains
 */
export interface USDTTokenConfig {
  chain: WalletChain;
  tokenAddress: string;
  decimals: number;
  name: string;
  symbol: string;
}

/**
 * Result of a transaction
 */
export interface TransactionResult {
  hash: string;
  from: string;
  to: string;
  value: bigint;
  fee: bigint;
  status: 'pending' | 'confirmed' | 'failed';
  chain: WalletChain;
  timestamp: Date;
}

/**
 * Result of a balance check
 */
export interface BalanceResult {
  nativeBalance: bigint;
  usdtBalance: bigint;
  formattedNativeBalance: string;
  formattedUSDTBalance: string;
  chain: WalletChain;
}

/**
 * Gas estimate for a transaction
 */
export interface GasEstimate {
  gasLimit: bigint;
  gasPrice: bigint;
  maxFeePerGas: bigint;
  maxPriorityFeePerGas: bigint;
  estimatedFee: bigint;
  estimatedFeeFormatted: string;
}

/**
 * Transfer parameters
 */
export interface TransferParams {
  to: string;
  amount: bigint;
  chain: WalletChain;
  gasSettings?: {
    maxFeePerGas?: bigint;
    maxPriorityFeePerGas?: bigint;
    gasLimit?: bigint;
  };
}

/**
 * Wallet configuration options
 */
export interface WalletConfig {
  seedPhrase?: string;
  chains: ChainConfig[];
  usdtTokens: USDTTokenConfig[];
  defaultChain?: WalletChain;
  rpcProviders?: Record<WalletChain, string>;
}

/**
 * MoonPay configuration
 */
export interface MoonPayConfig {
  apiKey: string;
  secretKey?: string;
  isTestnet?: boolean;
}

/**
 * Buy/Sell request parameters
 */
export interface FiatRequestParams {
  chain?: WalletChain;
  cryptoAsset: string;
  fiatCurrency: string;
  fiatAmount?: bigint;
  cryptoAmount?: bigint;
  config?: {
    colorCode?: string;
    theme?: 'light' | 'dark';
    language?: string;
    redirectURL?: string;
    lockAmount?: boolean;
    email?: string;
    externalCustomerId?: string;
  };
}
