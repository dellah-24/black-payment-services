'use client';

import { useState } from 'react';
import { AuthGuard } from '@/components/AuthGuard';
import { WalletBalance } from '@/components/WalletBalance';
import { useWalletAuth } from '@/hooks/useWalletAuth';
import { ChainKey, getChainConfig, SUPPORTED_CHAINS } from '@/config/chains';
import { logger } from '@/lib/logger';

export default function SendPage() {
  const { user } = useWalletAuth();
  const [recipient, setRecipient] = useState('');
  const [amount, setAmount] = useState('');
  const [selectedChain, setSelectedChain] = useState<ChainKey>(SUPPORTED_CHAINS[0] as ChainKey);
  const [balance, setBalance] = useState<string>('0');
  const [usdtBalance, setUsdtBalance] = useState<string>('0');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setIsLoading(true);
    setError(null);
    setSuccess(null);

    try {
      // Placeholder for transfer logic
      setSuccess(`Transaction submitted! Hash: placeholder`);
      setRecipient('');
      setAmount('');
    } catch (error) {
      const message = (error as Error).message;
      setError(message);
      logger.error('Transfer failed', error as Error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleMaxClick = () => {
    setAmount(usdtBalance);
  };

  return (
    <AuthGuard>
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
        <div className="container mx-auto px-4 py-8">
          <header className="mb-8">
            <h1 className="text-3xl font-bold text-white mb-2">Send</h1>
            <p className="text-gray-400">Send cryptocurrency to any address</p>
          </header>

          <div className="max-w-2xl mx-auto">
            <div className="bg-gray-800 rounded-2xl p-8 shadow-xl">
              <WalletBalance
                balance={balance}
                usdtBalance={usdtBalance}
                chain={selectedChain}
              />

              <form onSubmit={handleSend} className="mt-8 space-y-6">
                <div>
                  <label className="block text-gray-300 mb-2">Network</label>
                  <select
                    value={selectedChain}
                    onChange={(e) => setSelectedChain(e.target.value as ChainKey)}
                    className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-blue-500"
                  >
                    {SUPPORTED_CHAINS.map((chain) => (
                      <option key={chain} value={chain}>
                        {getChainConfig(chain as ChainKey).name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-gray-300 mb-2">Recipient Address</label>
                  <input
                    type="text"
                    value={recipient}
                    onChange={(e) => setRecipient(e.target.value)}
                    placeholder="Enter wallet address"
                    required
                    className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-gray-300 mb-2">Amount (USDT)</label>
                  <div className="relative">
                    <input
                      type="number"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      placeholder="0.00"
                      required
                      min="0"
                      step="0.01"
                      className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-blue-500"
                    />
                    <button
                      type="button"
                      onClick={handleMaxClick}
                      className="absolute right-2 top-1/2 -translate-y-1/2 bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded text-sm transition-colors"
                    >
                      MAX
                    </button>
                  </div>
                  <p className="text-gray-400 text-sm mt-2">
                    Available: {usdtBalance} USDT
                  </p>
                </div>

                {error && (
                  <div className="p-4 bg-red-900/50 border border-red-500 rounded-lg">
                    <p className="text-red-200">{error}</p>
                  </div>
                )}

                {success && (
                  <div className="p-4 bg-green-900/50 border border-green-500 rounded-lg">
                    <p className="text-green-200">{success}</p>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-800 text-white font-semibold py-4 px-6 rounded-xl transition-colors"
                >
                  {isLoading ? 'Sending...' : 'Send USDT'}
                </button>
              </form>
            </div>
          </div>
        </div>
      </div>
    </AuthGuard>
  );
}
