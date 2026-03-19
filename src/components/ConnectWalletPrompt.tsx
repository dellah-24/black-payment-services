'use client';

import Link from 'next/link';
import { Wallet, ArrowRight } from 'lucide-react';

interface ConnectWalletPromptProps {
  title?: string;
  message?: string;
  href?: string;
}

export default function ConnectWalletPrompt({
  title = 'Create Your Wallet First',
  message = 'Please create or import a wallet from the Dashboard first',
  href = '/'
}: ConnectWalletPromptProps) {
  return (
    <div className="min-h-screen py-8">
      <div className="max-w-2xl mx-auto px-4">
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-gray-800 to-gray-900 p-8 shadow-2xl border border-gray-700/50 text-center">
          <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl" />
          <div className="relative">
            <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center mx-auto mb-6 shadow-lg">
              <Wallet className="h-10 w-10 text-white" />
            </div>
            <h2 className="text-2xl font-bold text-white mb-2">
              {title}
            </h2>
            <p className="text-gray-400 mb-6">
              {message}
            </p>
            <Link 
              href={href} 
              className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl font-medium hover:scale-105 transition-transform"
            >
              Go to Dashboard <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
