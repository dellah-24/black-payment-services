'use client';

import { ChainKey } from '@/config/chains';
import { getChainConfig, SUPPORTED_CHAINS } from '@/config/chains';

interface ConnectWalletPromptProps {
  onConnect: (chain: ChainKey) => void;
  isConnecting: boolean;
}

export function ConnectWalletPrompt({ onConnect, isConnecting }: ConnectWalletPromptProps) {
  return (
    <div className="connect-wallet-prompt">
      <h2>Connect Your Wallet</h2>
      <p>Select a chain to connect your wallet:</p>
      <div className="chain-options">
        {SUPPORTED_CHAINS.map((chain) => {
          const config = getChainConfig(chain);
          return (
            <button
              key={chain}
              onClick={() => onConnect(chain)}
              disabled={isConnecting}
              className="chain-option"
            >
              <span className="chain-name">{config.name}</span>
              <span className="chain-symbol">{config.symbol}</span>
            </button>
          );
        })}
      </div>
      {isConnecting && <p>Connecting...</p>}
    </div>
  );
}
