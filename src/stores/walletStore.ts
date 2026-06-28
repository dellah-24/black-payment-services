import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { WalletChain } from '@/wallet/types';
import { getChainConfig } from '@/config/chains';

export interface WalletState {
  isConnected: boolean;
  address: string | null;
  chain: WalletChain | null;
  balance: string;
  usdtBalance: string;
  isLoading: boolean;
  error: string | null;
}

export interface WalletActions {
  connect: () => Promise<void>;
  disconnect: () => void;
  setChain: (chain: WalletChain) => void;
  updateBalance: (balance: string, usdtBalance: string) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  reset: () => void;
}

const initialState: WalletState = {
  isConnected: false,
  address: null,
  chain: null,
  balance: '0',
  usdtBalance: '0',
  isLoading: false,
  error: null,
};

export type WalletStore = WalletState & WalletActions;

export const useWalletStore = create<WalletStore>()(
  persist(
    (set, get) => ({
      ...initialState,

      connect: async () => {
        set({ isLoading: true, error: null });
        try {
          // Wallet connection logic will be implemented here
          // This is a placeholder for the actual connection logic
          set({ isConnected: true, isLoading: false });
        } catch (error) {
          set({ error: (error as Error).message, isLoading: false });
        }
      },

      disconnect: () => {
        set(initialState);
      },

      setChain: (chain: WalletChain) => {
        const chainConfig = getChainConfig(chain);
        set({ chain, balance: '0', usdtBalance: '0' });
      },

      updateBalance: (balance: string, usdtBalance: string) => {
        set({ balance, usdtBalance });
      },

      setLoading: (loading: boolean) => {
        set({ isLoading: loading });
      },

      setError: (error: string | null) => {
        set({ error });
      },

      reset: () => {
        set(initialState);
      },
    }),
    {
      name: 'wallet-storage',
      partialize: (state) => ({
        isConnected: state.isConnected,
        address: state.address,
        chain: state.chain,
        balance: state.balance,
        usdtBalance: state.usdtBalance,
      }),
    }
  )
);
