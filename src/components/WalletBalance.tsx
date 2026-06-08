'use client';

import React from 'react';
import { TrendingUp, DollarSign, Activity } from 'lucide-react';

interface WalletBalanceProps {
  balance: string;
  usdtBalance: string;
  usdValue: string;
  priceChange: number;
  isLoading: boolean;
  onRefresh: () => void;
}

export const WalletBalance = React.memo(function WalletBalance({
  balance,
  usdtBalance,
  usdValue,
  priceChange,
  isLoading,
  onRefresh,
}: WalletBalanceProps) {
  return (
    <div className="bg-gray-800/50 rounded-2xl p-6 border border-gray-700/50">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-white">Wallet Balance</h2>
        <button
          onClick={onRefresh}
          disabled={isLoading}
          className="p-2 rounded-lg bg-gray-700/50 hover:bg-gray-600/50 transition-colors disabled:opacity-50"
        >
          <Activity className={`w-5 h-5 text-gray-400 ${isLoading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      <div className="space-y-4">
        {/* USDT Balance */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-green-500/20 flex items-center justify-center">
              <DollarSign className="w-5 h-5 text-green-400" />
            </div>
            <div>
              <p className="text-sm text-gray-400">USDT Balance</p>
              <p className="text-xl font-bold text-white">{usdtBalance}</p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-sm text-gray-400">USD Value</p>
            <p className="text-lg font-semibold text-green-400">{usdValue}</p>
          </div>
        </div>

        {/* Native Balance */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-blue-500/20 flex items-center justify-center">
              <TrendingUp className="w-5 h-5 text-blue-400" />
            </div>
            <div>
              <p className="text-sm text-gray-400">Native Balance</p>
              <p className="text-xl font-bold text-white">{balance}</p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-sm text-gray-400">24h Change</p>
            <p className={`text-lg font-semibold ${priceChange >= 0 ? 'text-green-400' : 'text-red-400'}`}>
              {priceChange >= 0 ? '+' : ''}{priceChange.toFixed(2)}%
            </p>
          </div>
        </div>
      </div>
    </div>
  );
});
