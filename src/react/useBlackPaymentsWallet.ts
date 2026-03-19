/**
 * BlackPayments Wallet - React Native Hooks
 * 
 * React hooks for using BlackPayments Wallet in React Native applications
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import {
  BlackPaymentsWallet,
  WalletChain,
  createWallet,
  createWalletWithExistingSeed,
  BalanceResult,
  TransactionResult,
  GasEstimate,
  MoonPayConfig,
  FiatRequestParams,
} from '../wallet';

/**
 * Hook to create or import a wallet
 */
export function useWallet(chains?: WalletChain[]) {
  const [wallet, setWallet] = useState<BlackPaymentsWallet | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [addresses, setAddresses] = useState<Record<WalletChain, string>>({} as Record<WalletChain, string>);

  /**
   * Create a new wallet
   */
  const createNewWallet = useCallback(async (
    walletChains: WalletChain[] = chains || [WalletChain.ETHEREUM],
    options?: { isGasless?: boolean; isTestnet?: boolean }
  ) => {
    setIsLoading(true);
    setError(null);
    try {
      const newWallet = await createWallet(walletChains, options);
      setWallet(newWallet);
      setAddresses(newWallet.getAllAddresses());
      return newWallet;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to create wallet';
      setError(errorMessage);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [chains]);

  /**
   * Import an existing wallet
   */
  const importWallet = useCallback(async (
    seedPhrase: string,
    walletChains: WalletChain[] = chains || [WalletChain.ETHEREUM],
    options?: { isGasless?: boolean; isTestnet?: boolean }
  ) => {
    setIsLoading(true);
    setError(null);
    try {
      const importedWallet = await createWalletWithExistingSeed(seedPhrase, walletChains, options);
      setWallet(importedWallet);
      setAddresses(importedWallet.getAllAddresses());
      return importedWallet;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to import wallet';
      setError(errorMessage);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [chains]);

  /**
   * Get the seed phrase
   */
  const getSeedPhrase = useCallback(() => {
    return wallet?.getSeedPhrase() || '';
  }, [wallet]);

  /**
   * Dispose the wallet
   */
  const dispose = useCallback(() => {
    wallet?.dispose();
    setWallet(null);
    setAddresses({} as Record<WalletChain, string>);
  }, [wallet]);

  return {
    wallet,
    addresses,
    isLoading,
    error,
    createNewWallet,
    importWallet,
    getSeedPhrase,
    dispose,
  };
}

/**
 * Hook to manage balances
 */
export function useBalance(wallet: BlackPaymentsWallet | null, chain: WalletChain = WalletChain.ETHEREUM) {
  const [balance, setBalance] = useState<BalanceResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchBalance = useCallback(async () => {
    if (!wallet) return;
    
    setIsLoading(true);
    setError(null);
    try {
      const balanceResult = await wallet.getBalance(chain);
      setBalance(balanceResult);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch balance';
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  }, [wallet, chain]);

  useEffect(() => {
    fetchBalance();
  }, [fetchBalance]);

  return { balance, isLoading, error, refetch: fetchBalance };
}

/**
 * Hook to manage USDT transfers
 */
export function useTransfer(wallet: BlackPaymentsWallet | null) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [transaction, setTransaction] = useState<TransactionResult | null>(null);

  /**
   * Send USDT
   */
  const sendUSDT = useCallback(async (
    to: string,
    amount: bigint,
    chain: WalletChain
  ): Promise<TransactionResult> => {
    if (!wallet) throw new Error('Wallet not initialized');
    
    setIsLoading(true);
    setError(null);
    try {
      const result = await wallet.sendUSDT({ to, amount, chain });
      setTransaction(result);
      return result;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Transfer failed';
      setError(errorMessage);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [wallet]);

  /**
   * Quote USDT transfer
   */
  const quoteTransfer = useCallback(async (
    to: string,
    amount: bigint,
    chain: WalletChain
  ): Promise<GasEstimate> => {
    if (!wallet) throw new Error('Wallet not initialized');
    return wallet.quoteUSDTTransfer(to, amount, chain);
  }, [wallet]);

  /**
   * Send native token
   */
  const sendNative = useCallback(async (
    to: string,
    amount: bigint,
    chain: WalletChain
  ): Promise<TransactionResult> => {
    if (!wallet) throw new Error('Wallet not initialized');
    
    setIsLoading(true);
    setError(null);
    try {
      const result = await wallet.sendNative(to, amount, chain);
      setTransaction(result);
      return result;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Transfer failed';
      setError(errorMessage);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [wallet]);

  return {
    isLoading,
    error,
    transaction,
    sendUSDT,
    quoteTransfer,
    sendNative,
  };
}

/**
 * Hook for MoonPay fiat on/off-ramp
 */
export function useMoonPay(wallet: BlackPaymentsWallet | null) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Configure MoonPay
   */
  const configure = useCallback((config: MoonPayConfig) => {
    if (!wallet) throw new Error('Wallet not initialized');
    wallet.configureMoonPay(config);
  }, [wallet]);

  /**
   * Buy USDT with fiat
   */
  const buyUSDT = useCallback(async (params: FiatRequestParams): Promise<string> => {
    if (!wallet) throw new Error('Wallet not initialized');
    
    setIsLoading(true);
    setError(null);
    try {
      return await wallet.buyUSDT(params);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Buy failed';
      setError(errorMessage);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [wallet]);

  /**
   * Sell USDT for fiat
   */
  const sellUSDT = useCallback(async (params: FiatRequestParams): Promise<string> => {
    if (!wallet) throw new Error('Wallet not initialized');
    
    setIsLoading(true);
    setError(null);
    try {
      return await wallet.sellUSDT(params);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Sell failed';
      setError(errorMessage);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [wallet]);

  return {
    isLoading,
    error,
    configure,
    buyUSDT,
    sellUSDT,
  };
}

/**
 * Hook to validate addresses
 */
export function useAddressValidation(wallet: BlackPaymentsWallet | null) {
  return useCallback((address: string, chain: WalletChain): boolean => {
    if (!wallet) return false;
    return wallet.isValidAddress(address, chain);
  }, [wallet]);
}
