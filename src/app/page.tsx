'use client';

import { useState, useEffect } from 'react';
import { WalletBalance } from '@/components/WalletBalance';
import { WalletActions } from '@/components/WalletActions';
import { ChainSelector } from '@/components/ChainSelector';
import { useWallet } from '@/hooks/useWallet';
import { WalletChain } from '@/wallet/types';
import { getChainConfig, SUPPORTED_CHAINS } from '@/config/chains';
import { logger } from '@/lib/logger';

export default function Home() {
  const { isConnected, address, chain, balance, usdtBalance, isLoading, error, connect, disconnect, supportedChains } = useWallet();
  const [selectedChain, setSelectedChain] = useState<WalletChain>(SUPPORTED_CHAINS[0]);

  const handleConnect = async () => {
    try {
      await connect(selectedChain);
    } catch (error) {
      logger.error('Connection failed', error as Error);
    }
  };

  const handleDisconnect = () => {
    disconnect();
  };

  const handleChainChange = (chain: WalletChain) => {
    setSelectedChain(chain);
  };

  return (
    <main className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
      <div className="container mx-auto px-4 py-8">
        <header className="text-center mb-12">
          <h1 className="text-4xl font-bold text-white mb-4">
            BlackPayments Wallet
          </h1>
          <p className="text-gray-400 text-lg">
            Secure multi-chain cryptocurrency wallet
          </p>
        </header>

        <div className="max-w-4xl mx-auto">
          {!isConnected ? (
            <div className="bg-gray-800 rounded-2xl p-8 shadow-xl">
              <h2 className="text-2xl font-semibold text-white mb-6">
                Connect Your Wallet
              </h2>

              <div className="mb-6">
                <label className="block text-gray-300 mb-2">
                  Select Network
                </label>
                <ChainSelector
                  selectedChain={selectedChain}
                  onChainChange={handleChainChange}
                  supportedChains={supportedChains}
                />
              </div>

              <button
                onClick={handleConnect}
                disabled={isLoading}
                className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-800 text-white font-semibold py-4 px-6 rounded-xl transition-colors"
              >
                {isLoading ? 'Connecting...' : 'Connect Wallet'}
              </button>

              {error && (
                <div className="mt-4 p-4 bg-red-900/50 border border-red-500 rounded-lg">
                  <p className="text-red-200">{error}</p>
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-6">
              <div className="bg-gray-800 rounded-2xl p-6 shadow-xl">
                <div className="flex justify-between items-center mb-6">
                  <div>
                    <p className="text-gray-400 text-sm">Connected</p>
                    <p className="text-white font-mono text-sm">
                      {address?.slice(0, 6)}...{address?.slice(-4)}
                    </p>
                  </div>
                  <button
                    onClick={handleDisconnect}
                    className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg transition-colors"
                  >
                    Disconnect
                  </button>
                </div>

                <WalletBalance
                  balance={balance}
                  usdtBalance={usdtBalance}
                  chain={chain}
                />
              </div>

              <WalletActions
                address={address}
                chain={chain}
                balance={balance}
                usdtBalance={usdtBalance}
              />
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
