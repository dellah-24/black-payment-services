'use client';

import { useState, useEffect } from 'react';
import { AuthGuard } from '@/components/AuthGuard';
import { WalletBalance } from '@/components/WalletBalance';
import { WalletActions } from '@/components/WalletActions';
import { useWalletAuth } from '@/hooks/useWalletAuth';
import { ChainKey, getChainConfig, SUPPORTED_CHAINS } from '@/config/chains';
import { logger } from '@/lib/logger';

export default function PaymentsPage() {
  const { user } = useWalletAuth();
  const [selectedChain, setSelectedChain] = useState<ChainKey>(SUPPORTED_CHAINS[0] as ChainKey);
  const [balance, setBalance] = useState<string>('0');
  const [usdtBalance, setUsdtBalance] = useState<string>('0');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      if (!user) return;

      try {
        // Placeholder for wallet info loading - would integrate with wallet service
        setBalance('0');
        setUsdtBalance('0');
      } catch (error) {
        logger.error('Failed to load wallet data', error as Error);
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, [user, selectedChain]);

  const handleChainChange = (chain: ChainKey) => {
    setSelectedChain(chain);
    setIsLoading(true);
  };

  return (
    <AuthGuard>
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
        <div className="container mx-auto px-4 py-8">
          <header className="mb-8">
            <h1 className="text-3xl font-bold text-white mb-2">Payments</h1>
            <p className="text-gray-400">Send and receive payments</p>
          </header>

          <div className="mb-6">
            <label className="block text-gray-300 mb-2">Network</label>
            <select
              value={selectedChain}
              onChange={(e) => handleChainChange(e.target.value as ChainKey)}
              className="bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-blue-500"
            >
              {SUPPORTED_CHAINS.map((chain) => (
                <option key={chain} value={chain}>
                  {getChainConfig(chain as ChainKey).name}
                </option>
              ))}
            </select>
          </div>

          {isLoading ? (
            <div className="space-y-6">
              <div className="bg-gray-800 rounded-2xl p-6 animate-pulse">
                <div className="h-4 bg-gray-700 rounded w-1/4 mb-4"></div>
                <div className="h-8 bg-gray-700 rounded w-1/2"></div>
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              <WalletBalance
                balance={balance}
                usdtBalance={usdtBalance}
                chain={selectedChain}
              />

              <WalletActions
                onSend={() => {}}
                onReceive={() => {}}
                onSwap={() => {}}
              />
            </div>
          )}
        </div>
      </div>
    </AuthGuard>
  );
}
