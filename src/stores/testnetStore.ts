/**
 * Testnet Store
 * Manages testnet mode state across the application
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { ChainKey } from '../config/chains';

interface TestnetState {
  isTestnetMode: boolean;
  selectedTestnetChain: ChainKey;
  setTestnetMode: (enabled: boolean) => void;
  setSelectedTestnetChain: (chain: ChainKey) => void;
  toggleTestnetMode: () => void;
}

/**
 * Testnet store with persistence
 * Saves the testnet preference in localStorage
 */
export const useTestnetStore = create<TestnetState>()(
  persist(
    (set, get) => ({
      isTestnetMode: false,
      selectedTestnetChain: 'ethereum' as ChainKey,
      
      setTestnetMode: (enabled: boolean) => {
        set({ isTestnetMode: enabled });
      },
      
      setSelectedTestnetChain: (chain: ChainKey) => {
        set({ selectedTestnetChain: chain });
      },
      
      toggleTestnetMode: () => {
        const current = get().isTestnetMode;
        set({ isTestnetMode: !current });
      },
    }),
    {
      name: 'blackpayments-testnet-storage',
    }
  )
);

/**
 * Get the current chain config based on testnet mode
 */
export function getCurrentChainConfig(chain: ChainKey, isTestnetMode: boolean) {
  const { getActiveChainConfig } = require('../config/chains');
  return getActiveChainConfig(chain, isTestnetMode);
}

export default useTestnetStore;