/**
 * BlackPayments Wallet - Main Entry Point
 * 
 * A comprehensive multi-chain USDT wallet with P2P trading, DeFi, and more
 */

// Wallet Core
export { BlackPaymentsWallet } from './wallet/BlackPaymentsWallet';
export { HotWallet } from './wallet/HotWallet';
export { ColdWallet } from './wallet/ColdWallet';
export { SplitCustodyManager, createSplitCustodySystem } from './wallet/SplitCustodyManager';

// Wallet Factory Functions
export { createWallet, createWalletWithExistingSeed, createWalletWithPrivateKey, validatePrivateKey, getAddressFromMnemonic, generateMnemonic, validateMnemonic } from './wallet/factory';
export { createFullWallet } from './wallet/factory';
import { logger } from './lib/logger';

// Wallet Types
export type { 
  WalletChain, 
  WalletType, 
  ChainConfig, 
  USDTTokenConfig,
  TransactionResult,
  BalanceResult,
  GasEstimate,
  TransferParams,
  WalletConfig,
  MoonPayConfig,
  FiatRequestParams,
  SplitCustodyConfig,
  CustodyTransfer,
  WhitelistEntry,
  MultiSigRequest,
  EscrowTerms,
  EscrowState,
  DisputeEvidence
} from './wallet/types';

// Security
export { secureStorage, SecureStorage, StorageKey } from './wallet/SecureStorage';
export type { AddressBookEntry, AppSettings } from './wallet/SecureStorage';
export { authManager, AuthManager } from './wallet/AuthManager';
export type { AuthState, AuthConfig, AuthEvent, AuthEventType, AuthMethod } from './wallet/AuthManager';
export { encrypt, decrypt, sha256 } from './wallet/crypto';
export { logger } from './lib/logger';

// WalletConnect
export { walletConnect, WalletConnectProvider } from './wallet/WalletConnectProvider';
export type { WalletConnectSession, WalletConnectRequest, WalletConnectEvent, WalletConnectEventType } from './wallet/WalletConnectProvider';

// P2P Trading
export { p2pEngine, P2PEngine } from './p2p/Engine';
export type { 
  P2POrder, 
  P2PTrade, 
  Dispute, 
  P2PProfile, 
  ChatMessage, 
  Orderbook,
  OrderStatus,
  TradeStatus,
  PaymentMethod,
  DisputeReason,
  P2PEvent,
  P2PEventType
} from './p2p/Engine';

// Token Swap
export { tokenSwap, TokenSwap } from './swap/TokenSwap';
export type { Token, SwapQuote, SwapResult, SwapChainId } from './swap/TokenSwap';

// KYC Verification
export { kycManager, KYCManager } from './kyc';
export type { KYCProfile, KYCLevel, KYCStatus, DocumentType, DocumentUpload, KYCLivenessCheck, KYCEvent, KYCEventType } from './kyc';

// DeFi
export { defiManager, DeFiManager } from './defi';
export type { TokenBalance, StakingPosition, LendingPosition, PoolInfo, DeFiProtocol } from './defi';

// DApp Browser
export { dAppBrowser, DAppBrowser } from './browser/DAppBrowser';
export type { DApp, BrowserTab, Web3Connection } from './browser/DAppBrowser';

// Internationalization
export { i18n, I18nManager, t } from './i18n';
export type { Language, Translation, Translations } from './i18n';

// Chain Configurations
export { 
  CHAIN_CONFIGS, 
  USDT_TOKENS, 
  getChainConfig, 
  getUSDTConfig,
  getSupportedChains 
} from './wallet/chains';

// Provider System
export {
  providerRegistry,
  ProviderRegistry,
  RPCError,
  BaseProvider,
  EthereumProvider,
  SolanaProvider,
  BitcoinProvider,
  CosmosProvider,
  TONProvider,
  AptosProvider,
  Web3Provider,
  MobileAdapter,
  Adapter,
  AdapterStrategy,
  PromiseAdapter,
  CallbackAdapter,
} from './wallet/providers';
export type {
  ChainType,
  ProviderConfig,
  IRequestArguments,
  IBaseProvider,
  IAdapter,
  ResponseCallback,
  ErrorCallback,
  MobileAdapterConfig,
  Web3ProviderConfig,
} from './wallet/providers';

// Version
export const VERSION = '1.0.0';

/**
 * Initialize the wallet SDK
 */
export async function initialize(config?: {
  defaultChain?: import('./wallet/types').WalletChain;
  customRpcUrls?: Record<string, string>;
  encryptionKey?: string;
}): Promise<void> {
  // Set default chain
  if (config?.defaultChain) {
    // Set in storage or context
  }

  // Initialize encryption key if provided
  if (config?.encryptionKey) {
    const { secureStorage } = await import('./wallet/SecureStorage');
    secureStorage.initialize(config.encryptionKey);
  }

  logger.info('BlackPayments Wallet SDK initialized');
}

/**
 * Quick start - create a new wallet
 */
export async function quickStart(options?: {
  chains?: import('./wallet/types').WalletChain[];
}): Promise<import('./wallet/BlackPaymentsWallet').BlackPaymentsWallet> {
  const { createWallet } = await import('./wallet/factory');
  const chains = options?.chains || [
    (await import('./wallet/types')).WalletChain.ETHEREUM,
    (await import('./wallet/types')).WalletChain.BSC,
    (await import('./wallet/types')).WalletChain.TRON,
  ];
  
  return createWallet(chains);
}
