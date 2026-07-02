'use client';

import { useEffect, useRef, useCallback } from 'react';
import { ethers } from 'ethers';
import { useWalletStore } from '@/stores/walletStore';
import { logger } from '@/lib/logger';
import { getUSDTPrice, formatCurrency, usdtToUSD } from '@/lib/priceService';
import { getTronTRXBalance, getTronUSDTBalance } from '@/lib/tronWallet';
import { getActiveChainConfig } from '@/config/chains';
import { ChainKey } from '@/config/chains';
import { showToast } from '@/components/Toast';

// In-memory cache for USDT decimals per chain
const decimalsCache = new Map<string, number>();

// Last-known balance cache (non-sensitive) persisted to sessionStorage for fast perceived load
const LastKnownBalances = (() => {
  const key = 'lastKnownBalances_v1';
  const load = () => {
    try {
      const raw = typeof window !== 'undefined' ? sessionStorage.getItem(key) : null;
      return raw ? JSON.parse(raw) : {};
    } catch (e) { return {}; }
  };
  const save = (obj: Record<string, any>) => {
    try { sessionStorage.setItem(key, JSON.stringify(obj)); } catch (e) {}
  };
  let store = load();
  const get = (k: string) => store[k];
  const set = (k: string, v: any) => { store[k] = v; save(store); };
  const clear = () => { store = {}; save(store); };
  return { get, set, clear };
})();

// Generic retry wrapper with exponential backoff + jitter
async function withRetry<T>(fn: () => Promise<T>, retries = 3, baseDelay = 200): Promise<T> {
  let attempt = 0;
  while (true) {
    try {
      return await fn();
    } catch (err) {
      attempt++;
      const isLast = attempt > retries;
      if (isLast) throw err;
      const jitter = Math.random() * 100;
      const delay = baseDelay * Math.pow(2, attempt - 1) + jitter;
      await new Promise((res) => setTimeout(res, delay));
    }
  }
}

// Simple notify wrapper
function notify(type: 'success' | 'error' | 'info', message: string) {
  showToast(type, message);
}

/**
 * Hook to manage wallet balances with auto-polling
 */
export function useWalletBalance() {
  const {
    address,
    chain,
    updateBalance,
  } = useWalletStore();

  const pollingRef = useRef<number | null>(null);
  const pollDelayRef = useRef<number>(15000); // start at 15s

  const fetchBalances = useCallback(async (address: string, chainKey: ChainKey) => {
    if (chainKey === 'tron') {
      const [usdtBalance, nativeBalance] = await Promise.all([
        getTronUSDTBalance(address),
        getTronTRXBalance(address),
      ]);

      updateBalance(nativeBalance.formatted, usdtBalance.formatted);
      const key = `${address.toLowerCase()}:${chainKey}`;
      LastKnownBalances.set(key, { usdt: usdtBalance.formatted, native: nativeBalance.formatted, ts: Date.now() });
      return;
    }

    if (chainKey === 'solana') {
      updateBalance('0', '0');
      const key = `${address.toLowerCase()}:${chainKey}`;
      LastKnownBalances.set(key, { usdt: '0', native: '0', ts: Date.now() });
      return;
    }

    let formattedNative = '0';
    try {
      const chain = getActiveChainConfig(chainKey);
      const provider = new ethers.JsonRpcProvider(chain.rpcUrls[0]);

      const usdtContract = new ethers.Contract(chain.usdtAddress, [
        'function balanceOf(address owner) view returns (uint256)',
        'function decimals() view returns (uint8)',
      ], provider);

      // Parallelize balance and decimals with caching
       const decimalsKey = `${chainKey}:${chain.usdtAddress}`;
       const decimalsPromise = decimalsCache.has(decimalsKey)
         ? Promise.resolve(decimalsCache.get(decimalsKey)!)
         : withRetry(() => (usdtContract as any)['decimals'](), 2, 200).then((d: any) => {
             const num = Number(d);
             decimalsCache.set(decimalsKey, num);
             return num;
           });

       const [usdtBal, decimals] = await Promise.all([
         withRetry(() => (usdtContract as any)['balanceOf'](address), 2, 200),
         decimalsPromise,
       ]);

       const formattedUsdt = ethers.formatUnits(usdtBal as any, decimals);
      updateBalance(formattedNative, formattedUsdt);

      // Get native balance
      try {
        const native = await provider.getBalance(address);
        formattedNative = ethers.formatUnits(native, 18);
        updateBalance(formattedNative, formattedUsdt);
      } catch (e) {
        logger.warn('Failed to fetch native balance', e as Error);
      }

      // Persist last-known balances for perceived speed on reload
      const key = `${address.toLowerCase()}:${chainKey}`;
      LastKnownBalances.set(key, { usdt: formattedUsdt, native: formattedNative, ts: Date.now() });

    } catch (err) {
      logger.error('Error fetching balances', err as Error);
      updateBalance('0', '0');
      notify('error', 'Unable to fetch balances');
    }
  }, [updateBalance]);

  // Polling logic: refresh balances periodically while tab visible
  useEffect(() => {
    let visibilityHandler: any;
    const startPolling = () => {
      if (pollingRef.current) return;
      pollingRef.current = window.setInterval(async () => {
        if (!address) return;
        if (!chain) return;
        try {
          await fetchBalances(address, chain);
          pollDelayRef.current = 15000;
        } catch (e) {
          pollDelayRef.current = Math.min(120000, pollDelayRef.current * 2);
          if (pollingRef.current) {
            clearInterval(pollingRef.current);
            pollingRef.current = window.setInterval(async () => {
              if (address && chain) await fetchBalances(address, chain);
            }, pollDelayRef.current);
          }
        }
      }, pollDelayRef.current);
    };

    const stopPolling = () => {
      if (pollingRef.current) {
        clearInterval(pollingRef.current);
        pollingRef.current = null;
      }
    };

    if (address) startPolling();

    if (typeof document !== 'undefined') {
      visibilityHandler = () => {
        if (document.hidden) stopPolling();
        else if (address) startPolling();
      };
      document.addEventListener('visibilitychange', visibilityHandler);
    }

    return () => {
      stopPolling();
      if (typeof document !== 'undefined' && visibilityHandler) {
        document.removeEventListener('visibilitychange', visibilityHandler);
      }
    };
  }, [address, chain, fetchBalances]);

  // Fetch balances when address or chain changes
  useEffect(() => {
    if (address && chain) {
      fetchBalances(address, chain);
    }
  }, [address, chain, fetchBalances]);

  return { fetchBalances };
}
