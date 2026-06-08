import { create } from 'zustand';
import { ChainKey } from '@/config/chains';

interface WalletState {
  // Account state
  account: string | null;
  isAuthenticated: boolean;
  isAuthLoading: boolean;
  
  // Balance state
  balance: string;
  usdtBalance: string;
  usdValue: string;
  priceChange: number;
  isLoading: boolean;
  
  // Chain state
  selectedChain: ChainKey;
  
  // UI state
  theme: 'dark' | 'light';
  showWalletModal: boolean;
  showPasswordModal: boolean;
  showImportModal: boolean;
  showEncryptModal: boolean;
  showReceiveQR: boolean;
  
  // Actions
  setAccount: (account: string | null) => void;
  setIsAuthenticated: (isAuthenticated: boolean) => void;
  setIsAuthLoading: (isAuthLoading: boolean) => void;
  setBalance: (balance: string) => void;
  setUsdtBalance: (usdtBalance: string) => void;
  setUsdValue: (usdValue: string) => void;
  setPriceChange: (priceChange: number) => void;
  setIsLoading: (isLoading: boolean) => void;
  setSelectedChain: (chain: ChainKey) => void;
  setTheme: (theme: 'dark' | 'light') => void;
  setShowWalletModal: (show: boolean) => void;
  setShowPasswordModal: (show: boolean) => void;
  setShowImportModal: (show: boolean) => void;
  setShowEncryptModal: (show: boolean) => void;
  setShowReceiveQR: (show: boolean) => void;
  resetWallet: () => void;
}

const initialState = {
  account: null,
  isAuthenticated: false,
  isAuthLoading: true,
  balance: '0',
  usdtBalance: '0',
  usdValue: '$0.00',
  priceChange: 0,
  isLoading: false,
  selectedChain: 'ethereum' as ChainKey,
  theme: 'dark' as const,
  showWalletModal: false,
  showPasswordModal: false,
  showImportModal: false,
  showEncryptModal: false,
  showReceiveQR: false,
};

export const useWalletStore = create<WalletState>((set) => ({
  ...initialState,
  
  setAccount: (account) => set({ account }),
  setIsAuthenticated: (isAuthenticated) => set({ isAuthenticated }),
  setIsAuthLoading: (isAuthLoading) => set({ isAuthLoading }),
  setBalance: (balance) => set({ balance }),
  setUsdtBalance: (usdtBalance) => set({ usdtBalance }),
  setUsdValue: (usdValue) => set({ usdValue }),
  setPriceChange: (priceChange) => set({ priceChange }),
  setIsLoading: (isLoading) => set({ isLoading }),
  setSelectedChain: (selectedChain) => set({ selectedChain }),
  setTheme: (theme) => set({ theme }),
  setShowWalletModal: (showWalletModal) => set({ showWalletModal }),
  setShowPasswordModal: (showPasswordModal) => set({ showPasswordModal }),
  setShowImportModal: (showImportModal) => set({ showImportModal }),
  setShowEncryptModal: (showEncryptModal) => set({ showEncryptModal }),
  setShowReceiveQR: (showReceiveQR) => set({ showReceiveQR }),
  resetWallet: () => set(initialState),
}));
