/**
 * BlackPayments Wallet - Main Entry Point
 * 
 * Export all wallet types and factory functions
 */

export { BlackPaymentsWallet } from './BlackPaymentsWallet';
export { BlackPaymentsSmartWallet, createSmartWallet, WalletMode } from './BlackPaymentsSmartWallet';
export { WalletChain } from './types';
export { PaymentGateway } from './PaymentGateway';
export type { PaymentStatus, PaymentMethod, PaymentCurrency, PaymentLinkConfig, PaymentRequest, ApiKeyConfig, WebhookEventType, WebhookPayload, PaymentGatewayConfig } from './PaymentGateway';
export { createWallet, createWalletWithExistingSeed, createWalletWithPrivateKey, createFullWallet, generateMnemonic, validateMnemonic, validatePrivateKey, getAddressFromMnemonic } from './factory';
export { getSupportedChains } from './chains';
export type { BalanceResult, TransactionResult, GasEstimate, MoonPayConfig, FiatRequestParams } from './types';

// Provider exports
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
  PromiseAdapter,
  CallbackAdapter,
} from './providers';
export type { ChainType, ProviderConfig, IRequestArguments, IBaseProvider, IAdapter, ResponseCallback, ErrorCallback, MobileAdapterConfig, Web3ProviderConfig } from './providers';

// Alchemy Account Abstraction exports
export {
  AlchemyAccountAbstractionService,
  aaService,
  createAASmartAccount,
  initAAWithSigner,
  type AAChain,
  type SmartAccountConfig,
  type SessionKeyConfig,
  type MultiOwnerConfig,
  type GasSponsorshipConfig,
  type AAWalletData,
  type AATransactionRequest
} from './AlchemyAccountAbstraction';
