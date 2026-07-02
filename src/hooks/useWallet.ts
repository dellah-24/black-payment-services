'use client';

import { useState, useCallback, useEffect } from 'react';
import { ChainKey } from '@/config/chains';
import { getChainConfig, SUPPORTED_CHAINS } from '@/config/chains';
import { useWalletStore } from '@/stores/walletStore';
import { walletService } from '@/services/walletService';
import { logger } from '@/lib/logger';

export function useWallet() {
  const { isConnected, address, chain, balance, usdtBalance, isLoading, error, setChain, updateBalance, setLoading, setError, reset } = useWalletStore();
  const [isConnecting, setIsConnecting] = useState(false);

  const connect = useCallback(async (selectedChain: ChainKey) => {
    setIsConnecting(true);
    setLoading(true);
    setError(null);

    try {
      const chainConfig = getChainConfig(selectedChain);
      setChain(selectedChain);
      setLoading(false);
      setIsConnecting(false);
    } catch (error) {
      const message = (error as Error).message;
      setError(message);
      setLoading(false);
      setIsConnecting(false);
      logger.error('Wallet connection failed', error as Error);
    }
  }, [setChain, setLoading, setError]);

  const disconnect = useCallback(() => {
    reset();
    setIsConnecting(false);
  }, [reset]);

  const send = useCallback(async (to: string, amount: string) => {
    if (!isConnected || !address || !chain) {
      throw new Error('Wallet not connected');
    }

    setLoading(true);
    setError(null);

    try {
      const result = await walletService.transfer({
        from: address,
        to,
        amount,
        chain,
      });

      setLoading(false);
      return result;
    } catch (error) {
      const message = (error as Error).message;
      setError(message);
      setLoading(false);
      logger.error('Transfer failed', error as Error);
      throw error;
    }
  }, [isConnected, address, chain, setLoading, setError]);

  const refreshBalance = useCallback(async () => {
    if (!isConnected || !address || !chain) return;

    try {
      const info = await walletService.getWalletInfo(address, chain);
      updateBalance(info.balance, info.usdtBalance);
    } catch (error) {
      logger.error('Failed to refresh balance', error as Error);
    }
  }, [isConnected, address, chain, updateBalance]);

  useEffect(() => {
    if (isConnected) {
      refreshBalance();
    }
  }, [isConnected, refreshBalance]);

  return {
    isConnected,
    address,
    chain,
    balance,
    usdtBalance,
    isLoading,
    error,
    isConnecting,
    connect,
    disconnect,
    send,
    refreshBalance,
    supportedChains: SUPPORTED_CHAINS,
  };
}
