'use client';

import React from 'react';
import { ChevronRight } from 'lucide-react';
import { ChainKey, CHAINS } from '@/config/chains';

interface ChainSelectorProps {
  selectedChain: ChainKey;
  onChainSelect: (chain: ChainKey) => void;
}

export const ChainSelector = React.memo(function ChainSelector({
  selectedChain,
  onChainSelect,
}: ChainSelectorProps) {
  const chains = Object.entries(CHAINS) as [ChainKey, typeof CHAINS[ChainKey]][];

  return (
    <div className="bg-gray-800/50 rounded-2xl p-6 border border-gray-700/50">
      <h2 className="text-lg font-semibold text-white mb-4">Select Chain</h2>
      
      <div className="space-y-2">
        {chains.map(([key, config]) => (
          <button
            key={key}
            onClick={() => onChainSelect(key)}
            className={`w-full flex items-center justify-between p-4 rounded-xl transition-colors ${
              selectedChain === key
                ? 'bg-indigo-600/20 border border-indigo-500/50'
                : 'bg-gray-700/30 hover:bg-gray-700/50 border border-transparent'
            }`}
          >
            <div className="flex items-center gap-3">
              <div
                className="w-10 h-10 rounded-full flex items-center justify-center"
                style={{ backgroundColor: config.color ? `${config.color}20` : '#6366f120' }}
              >
                <span className="text-lg font-bold" style={{ color: config.color || '#6366f1' }}>
                  {config.symbol.charAt(0)}
                </span>
              </div>
              <div className="text-left">
                <p className="font-medium text-white">{config.name}</p>
                <p className="text-sm text-gray-400">{config.symbol}</p>
              </div>
            </div>
            <ChevronRight className={`w-5 h-5 ${selectedChain === key ? 'text-indigo-400' : 'text-gray-500'}`} />
          </button>
        ))}
      </div>
    </div>
  );
});
