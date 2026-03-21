/**
 * BlackPayments Wallet - Main Entry Point
 * 
 * Export all wallet types and factory functions
 */

export { BlackPaymentsWallet } from './BlackPaymentsWallet';
export { WalletChain, type WalletChainType } from './types';
export { createWallet, createWalletWithExistingSeed, createWalletWithPrivateKey, createFullWallet, createTestWallet, generateMnemonic, validateMnemonic, validatePrivateKey, getAddressFromMnemonic } from './factory';
export { getSupportedChains, getChainById, getChainByName } from './chains';
export type { BalanceResult, TransactionResult, GasEstimate, SendUSDTParams, QuoteParams, MoonPayConfig, FiatRequestParams } from './types';
