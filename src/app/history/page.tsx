'use client';

import { useState, useEffect } from 'react';
import { AuthGuard } from '@/components/AuthGuard';
import { TransactionStatus } from '@/components/TransactionStatus';
import { useWalletAuth } from '@/hooks/useWalletAuth';
import { ChainKey } from '@/config/chains';
import { getChainConfig, SUPPORTED_CHAINS } from '@/config/chains';
import { paymentService } from '@/lib/paymentService';
import { logger } from '@/lib/logger';

interface Transaction {
  id: string;
  type: 'send' | 'receive' | 'swap' | 'custodial';
  amount: string;
  currency: string;
  status: 'pending' | 'completed' | 'failed';
  timestamp: string;
  from?: string;
  to?: string;
  chain: ChainKey;
  txHash?: string;
}

export default function HistoryPage() {
  const { user } = useWalletAuth();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedChain, setSelectedChain] = useState<ChainKey>(SUPPORTED_CHAINS[0] as ChainKey);

  useEffect(() => {
    const loadHistory = async () => {
      if (!user) return;

      try {
        const history = await paymentService.getTransactionHistory(user.id, selectedChain);
        setTransactions(history);
      } catch (error) {
        logger.error('Failed to load transaction history', error as Error);
      } finally {
        setIsLoading(false);
      }
    };

    loadHistory();
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
            <h1 className="text-3xl font-bold text-white mb-2">Transaction History</h1>
            <p className="text-gray-400">View your past transactions</p>
          </header>

          <div className="mb-6">
            <label className="block text-gray-300 mb-2">Filter by Network</label>
            <select
              value={selectedChain}
              onChange={(e) => handleChainChange(e.target.value as ChainKey)}
              className="bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-blue-500"
            >
              {SUPPORTED_CHAINS.map((chain) => (
                <option key={chain} value={chain}>
                  {getChainConfig(chain).name}
                </option>
              ))}
            </select>
          </div>

          {isLoading ? (
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="bg-gray-800 rounded-xl p-6 animate-pulse">
                  <div className="h-4 bg-gray-700 rounded w-1/4 mb-4"></div>
                  <div className="h-6 bg-gray-700 rounded w-1/2"></div>
                </div>
              ))}
            </div>
          ) : transactions.length === 0 ? (
            <div className="bg-gray-800 rounded-xl p-8 text-center">
              <p className="text-gray-400">No transactions found</p>
            </div>
          ) : (
            <div className="space-y-4">
              {transactions.map((tx) => (
                <TransactionStatus
                  key={tx.id}
                  status={tx.status === 'completed' ? 'confirmed' : tx.status}
                  hash={tx.txHash}
                  chain={tx.chain}
                  amount={tx.amount}
                  to={tx.to}
                  from={tx.from}
                  timestamp={tx.timestamp}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </AuthGuard>
  );
}
