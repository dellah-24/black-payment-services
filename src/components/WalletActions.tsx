'use client';

import React from 'react';
import { Send, QrCode, History, Settings } from 'lucide-react';
import Link from 'next/link';

interface WalletActionsProps {
  account: string | null;
  onShowReceiveQR: () => void;
}

export const WalletActions = React.memo(function WalletActions({
  account,
  onShowReceiveQR,
}: WalletActionsProps) {
  if (!account) return null;

  return (
    <div className="bg-gray-800/50 rounded-2xl p-6 border border-gray-700/50">
      <h2 className="text-lg font-semibold text-white mb-4">Quick Actions</h2>
      
      <div className="grid grid-cols-2 gap-4">
        <Link
          href="/send"
          className="flex flex-col items-center justify-center p-4 rounded-xl bg-indigo-600/20 hover:bg-indigo-600/30 transition-colors border border-indigo-500/30"
        >
          <Send className="w-6 h-6 text-indigo-400 mb-2" />
          <span className="text-sm font-medium text-white">Send</span>
        </Link>

        <button
          onClick={onShowReceiveQR}
          className="flex flex-col items-center justify-center p-4 rounded-xl bg-green-600/20 hover:bg-green-600/30 transition-colors border border-green-500/30"
        >
          <QrCode className="w-6 h-6 text-green-400 mb-2" />
          <span className="text-sm font-medium text-white">Receive</span>
        </button>

        <Link
          href="/history"
          className="flex flex-col items-center justify-center p-4 rounded-xl bg-blue-600/20 hover:bg-blue-600/30 transition-colors border border-blue-500/30"
        >
          <History className="w-6 h-6 text-blue-400 mb-2" />
          <span className="text-sm font-medium text-white">History</span>
        </Link>

        <Link
          href="/settings"
          className="flex flex-col items-center justify-center p-4 rounded-xl bg-gray-600/20 hover:bg-gray-600/30 transition-colors border border-gray-500/30"
        >
          <Settings className="w-6 h-6 text-gray-400 mb-2" />
          <span className="text-sm font-medium text-white">Settings</span>
        </Link>
      </div>
    </div>
  );
});
