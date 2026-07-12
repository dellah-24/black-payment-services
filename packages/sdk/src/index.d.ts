/**
 * @profullstack/tempesttouch - Tempest Touch SDK
 * Cryptocurrency payment integration for Node.js
 *
 * @module @profullstack/tempesttouch
 */

// Client exports
export { TempestTouchClient } from './client.js';
export type { 
  TempestTouchClientOptions, 
  PaymentParams, 
  ListPaymentsParams, 
  WaitForPaymentOptions, 
  CreateBusinessParams,
  SupportedCoinsParams,
  SupportedCoin,
  SupportedToken,
  SupportedCoinsResponse,
  TokensResponse,
} from './client.js';

export {
  getTokens,
  getSupportedCoins,
} from './tokens.js';
export type {
  TokenDiscoveryParams,
} from './tokens.js';

// Payment exports
export {
  createPayment,
  getPayment,
  listPayments,
  Blockchain,
  Cryptocurrency,
  PaymentStatus,
  FiatCurrency,
} from './payments.js';
export type { 
  CreatePaymentParams, 
  GetPaymentParams, 
  ListPaymentsFnParams 
} from './payments.js';

// Webhook exports
export {
  verifyWebhookSignature,
  generateWebhookSignature,
  parseWebhookPayload,
  createWebhookHandler,
  WebhookEvent,
} from './webhooks.js';
export type {
  VerifyWebhookParams,
  GenerateWebhookParams,
  WebhookHandlerOptions,
  ParsedWebhookEvent,
} from './webhooks.js';

// Wallet exports
export {
  WalletClient,
  WalletChain,
  DEFAULT_CHAINS,
  generateMnemonic,
  validateMnemonic,
  getDerivationPath,
  restoreFromBackup,
} from './wallet.js';
export type {
  WalletChainType,
  WalletCreateOptions,
  WalletImportOptions,
  WalletAddress,
  AddressListResult,
  WalletBalance,
  SendOptions,
  HistoryOptions,
  Transaction,
  FeeEstimate,
} from './wallet.js';

// Swap exports
export {
  SwapClient,
  SwapCoins,
  SwapStatus,
  getSwapCoins,
  getSwapQuote,
  createSwap,
  getSwapStatus,
  getSwapHistory,
} from './swap.js';
export type {
  SwapStatusType,
  SwapClientOptions,
  CoinInfo,
  CoinsResult,
  SwapQuote,
  QuoteResult,
  CreateSwapParams,
  Swap,
  SwapResult,
  WaitForSwapOptions,
  SwapHistoryOptions,
  SwapHistoryPagination,
  SwapHistoryResult,
} from './swap.js';

// Reputation exports
export {
  submitReceipt,
  getReputation,
  getCredential,
  verifyCredential,
  getRevocationList,
} from './reputation.js';
export type {
  ReceiptInput,
  ReputationWindow,
  ReputationResult,
  Credential,
} from './reputation.js';

import { TempestTouchClient } from './client.js';
export default TempestTouchClient;
