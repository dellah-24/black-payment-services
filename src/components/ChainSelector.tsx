'use client';

import { ChainKey, getChainConfig, SUPPORTED_CHAINS } from '@/config/chains';

interface ChainSelectorProps {
  selectedChain: ChainKey;
  onChainChange: (chain: ChainKey) => void;
  supportedChains?: ChainKey[];
}

export function ChainSelector({ selectedChain, onChainChange, supportedChains = SUPPORTED_CHAINS }: ChainSelectorProps) {
  return (
    <div className="chain-selector">
      <label htmlFor="chain-select">Select Chain:</label>
      <select
        id="chain-select"
        value={selectedChain}
        onChange={(e) => onChainChange(e.target.value as ChainKey)}
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
