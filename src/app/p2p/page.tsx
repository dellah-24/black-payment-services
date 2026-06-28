'use client';

import { useState, useEffect } from 'react';
import { AuthGuard } from '@/components/AuthGuard';
import { useWalletAuth } from '@/hooks/useWalletAuth';
import { WalletChain } from '@/wallet/types';
import { getChainConfig, SUPPORTED_CHAINS } from '@/config/chains';
import { p2pEngine } from '@/p2p/Engine';
import { logger } from '@/lib/logger';

interface P2POffer {
  id: string;
  type: 'buy' | 'sell';
  amount: string;
  price: string;
  currency: string;
  paymentMethod: string;
  limits: { min: string; max: string };
  user: {
    id: string;
    name: string;
    rating: number;
    completedTrades: number;
  };
  chain: WalletChain;
}

export default function P2PPage() {
  const { user } = useWalletAuth();
  const [offers, setOffers] = useState<P2POffer[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedChain, setSelectedChain] = useState<WalletChain>(SUPPORTED_CHAINS[0]);
  const [filter, setFilter] = useState<'all' | 'buy' | 'sell'>('all');

  useEffect(() => {
    const loadOffers = async () => {
      try {
        const allOffers = await p2pEngine.getOffers(selectedChain, filter);
        setOffers(allOffers);
      } catch (error) {
        logger.error('Failed to load P2P offers', error as Error);
      } finally {
        setIsLoading(false);
      }
    };

    loadOffers();
  }, [user, selectedChain, filter]);

  const handleCreateOffer = async (type: 'buy' | 'sell') => {
    if (!user) return;

    try {
      await p2pEngine.createOffer({
        userId: user.id,
        type,
        chain: selectedChain,
        amount: '1000',
        price: '1.00',
        currency: 'USDT',
        paymentMethod: 'bank_transfer',
        limits: { min: '100', max: '10000' },
      });
    } catch (error) {
      logger.error('Failed to create offer', error as Error);
    }
  };

  return (
    <AuthGuard>
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
        <div className="container mx-auto px-4 py-8">
          <header className="mb-8">
            <h1 className="text-3xl font-bold text-white mb-2">P2P Trading</h1>
            <p className="text-gray-400">Buy and sell USDT directly with other users</p>
          </header>

          <div className="flex flex-col md:flex-row gap-4 mb-8">
            <div className="flex-1">
              <label className="block text-gray-300 mb-2">Network</label>
              <select
                value={selectedChain}
                onChange={(e) => setSelectedChain(e.target.value as WalletChain)}
                className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-blue-500"
              >
                {SUPPORTED_CHAINS.map((chain) => (
                  <option key={chain} value={chain}>
                    {getChainConfig(chain).name}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex-1">
              <label className="block text-gray-300 mb-2">Filter</label>
              <select
                value={filter}
                onChange={(e) => setFilter(e.target.value as 'all' | 'buy' | 'sell')}
                className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-blue-500"
              >
                <option value="all">All Offers</option>
                <option value="buy">Buy USDT</option>
                <option value="sell">Sell USDT</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
            <button
              onClick={() => handleCreateOffer('buy')}
              className="bg-green-600 hover:bg-green-700 text-white font-semibold py-4 px-6 rounded-xl transition-colors"
            >
              Create Buy Offer
            </button>
            <button
              onClick={() => handleCreateOffer('sell')}
              className="bg-red-600 hover:bg-red-700 text-white font-semibold py-4 px-6 rounded-xl transition-colors"
            >
              Create Sell Offer
            </button>
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
          ) : offers.length === 0 ? (
            <div className="bg-gray-800 rounded-xl p-8 text-center">
              <p className="text-gray-400">No offers available</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {offers.map((offer) => (
                <div
                  key={offer.id}
                  className={`bg-gray-800 rounded-xl p-6 border-2 ${
                    offer.type === 'buy' ? 'border-green-500' : 'border-red-500'
                  }`}
                >
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <span
                        className={`px-2 py-1 rounded text-xs font-semibold ${
                          offer.type === 'buy'
                            ? 'bg-green-900 text-green-300'
                            : 'bg-red-900 text-red-300'
                        }`}
                      >
                        {offer.type.toUpperCase()}
                      </span>
                    </div>
                    <span className="text-gray-400 text-sm">{getChainConfig(offer.chain).name}</span>
                  </div>

                  <div className="mb-4">
                    <p className="text-2xl font-bold text-white">
                      {offer.price} {offer.currency}
                    </p>
                    <p className="text-gray-400">
                      {offer.amount} {offer.currency} available
                    </p>
                  </div>

                  <div className="mb-4">
                    <p className="text-gray-400 text-sm">Limits</p>
                    <p className="text-white">
                      {offer.limits.min} - {offer.limits.max} {offer.currency}
                    </p>
                  </div>

                  <div className="mb-4">
                    <p className="text-gray-400 text-sm">Payment Method</p>
                    <p className="text-white capitalize">{offer.paymentMethod.replace('_', ' ')}</p>
                  </div>

                  <div className="flex items-center justify-between pt-4 border-t border-gray-700">
                    <div>
                      <p className="text-white font-semibold">{offer.user.name}</p>
                      <p className="text-gray-400 text-sm">
                        ⭐ {offer.user.rating} • {offer.user.completedTrades} trades
                      </p>
                    </div>
                    <button className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors">
                      Trade
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </AuthGuard>
  );
}
