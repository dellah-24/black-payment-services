'use client';

import { WalletChain } from '@/wallet/types';
import { getChainConfig, SUPPORTED_CHAINS } from '@/config/chains';

interface ChainSelectorProps {
  selectedChain: WalletChain;
  onChainChange: (chain: WalletChain) => void;
}

export function ChainSelector({ selectedChain, onChainChange }: ChainSelectorProps) {
  return (
    <div className="chain-selector">
      <label htmlFor="chain-select">Select Chain:</label>
      <select
        id="chain-select"
        value={selectedChain}
        onChange={(e) => onChainChange(e.target.value as WalletChain)}
      >
        {SUPPORTED_CHAINS.map((chain) => (
          <option key={chain} value={chain}>
            {getChainConfig(chain).name}
          </option>
        ))}
      </select>
    </div>
  );
}
