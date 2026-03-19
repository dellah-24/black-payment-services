'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { 
  Lock, 
  ArrowLeft, 
  ArrowRight,
  Wallet, 
  Flame, 
  Shield, 
  Copy, 
  Check,
  ExternalLink,
  RefreshCw,
  AlertTriangle,
  Zap
} from 'lucide-react';

interface WalletData {
  address: string;
  balance: string;
  usdtBalance: string;
  type: 'hot' | 'cold';
  lastActivity: string;
}

export default function WalletsPage() {
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');
  const [account, setAccount] = useState<string | null>(null);
  const [hotWallet, setHotWallet] = useState<WalletData>({
    address: '',
    balance: '0',
    usdtBalance: '0',
    type: 'hot',
    lastActivity: new Date().toISOString(),
  });
  const [coldWallet, setColdWallet] = useState<WalletData>({
    address: '',
    balance: '0',
    usdtBalance: '0',
    type: 'cold',
    lastActivity: new Date().toISOString(),
  });
  const [copied, setCopied] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  useEffect(() => {
    const savedTheme = localStorage.getItem('theme') as 'dark' | 'light' | null;
    if (savedTheme) setTheme(savedTheme);
    
    const savedAccount = localStorage.getItem('account');
    if (savedAccount) {
      setAccount(savedAccount);
      // Initialize hot wallet with main account
      setHotWallet(prev => ({
        ...prev,
        address: savedAccount,
        usdtBalance: '500.00',
      }));
    }

    // Generate or load cold wallet
    const savedColdWallet = localStorage.getItem('coldWallet');
    if (savedColdWallet) {
      setColdWallet(JSON.parse(savedColdWallet));
    } else {
      // Generate a new cold wallet address (demo)
      const newColdAddress = '0x' + Array(40).fill(0).map(() => 
        Math.floor(Math.random() * 16).toString(16)
      ).join('');
      const newCold: WalletData = {
        address: newColdAddress,
        balance: '0',
        usdtBalance: '10000.00',
        type: 'cold',
        lastActivity: new Date().toISOString(),
      };
      setColdWallet(newCold);
      localStorage.setItem('coldWallet', JSON.stringify(newCold));
    }
  }, []);

  const copyAddress = (address: string) => {
    navigator.clipboard.writeText(address);
    setCopied(address);
    setTimeout(() => setCopied(null), 2000);
  };

  const refreshBalances = async () => {
    setIsRefreshing(true);
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1500));
    setIsRefreshing(false);
  };

  const transferToCold = () => {
    alert('This would initiate a transfer from Hot Wallet to Cold Wallet. In production, this would require multi-signature approval.');
  };

  const transferToHot = () => {
    alert('This would initiate a transfer from Cold Wallet to Hot Wallet. In production, this would require multi-signature approval.');
  };

  if (!account) {
    return (
      <div className="min-h-screen py-8">
        <div className="max-w-4xl mx-auto px-4">
          <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-gray-800 to-gray-900 p-8 shadow-2xl border border-gray-700/50 text-center">
            <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl" />
            <div className="relative">
              <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center mx-auto mb-6 shadow-lg">
                <Wallet className="h-10 w-10 text-white" />
              </div>
              <h2 className="text-2xl font-bold text-white mb-2">
                Connect Wallet First
              </h2>
              <p className="text-gray-400 mb-6">
                Please connect your wallet from the Dashboard first
              </p>
              <Link href="/" className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl font-medium hover:scale-105 transition-transform">
                Go to Dashboard <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen py-8">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center">
            <Link href="/" className="p-2 rounded-lg bg-gray-800/50 hover:bg-gray-700/50 transition-colors mr-4">
              <ArrowLeft className="h-5 w-5" />
            </Link>
            <h1 className="text-2xl font-bold text-white">
              Wallet Management
            </h1>
          </div>
          <button
            onClick={refreshBalances}
            disabled={isRefreshing}
            className="p-2 rounded-lg bg-gray-800/50 hover:bg-gray-700/50 transition-colors"
          >
            <RefreshCw className={`h-5 w-5 ${isRefreshing ? 'animate-spin' : ''}`} />
          </button>
        </div>

        {/* G.O.L.D. Rule Explanation */}
        <div className="rounded-xl p-4 mb-8 bg-primary-900/20 border border-primary-700">
          <h3 className="font-semibold mb-2 text-primary-400">
            G.O.L.D. Rule for Split-Custody
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <span className="font-bold text-primary-400">G</span> - Generate yield (Cold)
            </div>
            <div>
              <span className="font-bold text-primary-400">O</span> - Operate daily (Hot)
            </div>
            <div>
              <span className="font-bold text-primary-400">L</span> - Limit hot wallet funds
            </div>
            <div>
              <span className="font-bold text-primary-400">D</span> - Double-check addresses
            </div>
          </div>
        </div>

        {/* Hot Wallet */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-4">
            <div className="bg-orange-500/20 p-2 rounded-lg">
              <Flame className="h-6 w-6 text-orange-500" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">
                Hot Wallet
              </h2>
              <p className="text-sm text-gray-400">
                For daily operations & active trading
              </p>
            </div>
            <span className="ml-auto px-3 py-1 rounded-full text-xs font-medium bg-orange-900/30 text-orange-400">
              Online
            </span>
          </div>
          
          <div className="rounded-2xl bg-gray-800/50 backdrop-blur-sm border border-gray-700/50 p-6">
            <div className="p-4 rounded-xl bg-gray-900/50 mb-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-gray-400 mb-1">
                    Wallet Address
                  </p>
                  <code className="font-mono text-sm text-white">
                    {hotWallet.address.slice(0, 14)}...{hotWallet.address.slice(-12)}
                  </code>
                </div>
                <button
                  onClick={() => copyAddress(hotWallet.address)}
                  className="p-2 rounded-lg hover:bg-gray-700"
                >
                  {copied === hotWallet.address ? 
                    <Check className="h-5 w-5 text-green-500" /> : 
                    <Copy className="h-5 w-5" />
                  }
                </button>
              </div>
            </div>
            
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              <div className="p-4 rounded-xl bg-gray-900/50">
                <p className="text-xs text-gray-400 mb-1">
                  USDT Balance
                </p>
                <p className="text-xl font-bold text-primary-600">
                  ${parseFloat(hotWallet.usdtBalance).toFixed(2)}
                </p>
              </div>
              <div className="p-4 rounded-xl bg-gray-900/50">
                <p className="text-xs text-gray-400 mb-1">
                  Allocation
                </p>
                <p className="text-xl font-bold text-white">
                  5-20%
                </p>
              </div>
              <div className="p-4 rounded-xl bg-gray-900/50">
                <p className="text-xs text-gray-400 mb-1">
                  Network
                </p>
                <p className="text-xl font-bold text-white">
                  TRC-20
                </p>
              </div>
              <div className="p-4 rounded-xl bg-gray-900/50">
                <p className="text-xs text-gray-400 mb-1">
                  Last Activity
                </p>
                <p className="text-sm font-medium text-white">
                  Just now
                </p>
              </div>
            </div>
            
            <div className="flex gap-3">
              <button
                onClick={transferToCold}
                className="flex-1 py-3 bg-orange-600 hover:bg-orange-700 text-white rounded-xl font-medium flex items-center justify-center gap-2"
              >
                <Shield className="h-4 w-4" />
                Transfer to Cold
              </button>
            </div>
          </div>
        </div>

        {/* Cold Wallet */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-4">
            <div className="bg-blue-500/20 p-2 rounded-lg">
              <Shield className="h-6 w-6 text-blue-500" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">
                Cold Wallet
              </h2>
              <p className="text-sm text-gray-400">
                Long-term storage & reserves
              </p>
            </div>
            <span className="ml-auto px-3 py-1 rounded-full text-xs font-medium bg-blue-900/30 text-blue-400">
              Offline
            </span>
          </div>
          
          <div className="rounded-2xl bg-gray-800/50 backdrop-blur-sm border border-gray-700/50 p-6">
            <div className="p-4 rounded-xl bg-gray-900/50 mb-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-gray-400 mb-1">
                    Wallet Address
                  </p>
                  <code className="font-mono text-sm text-white">
                    {coldWallet.address.slice(0, 14)}...{coldWallet.address.slice(-12)}
                  </code>
                </div>
                <button
                  onClick={() => copyAddress(coldWallet.address)}
                  className="p-2 rounded-lg hover:bg-gray-700"
                >
                  {copied === coldWallet.address ? 
                    <Check className="h-5 w-5 text-green-500" /> : 
                    <Copy className="h-5 w-5" />
                  }
                </button>
              </div>
            </div>
            
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              <div className="p-4 rounded-xl bg-gray-900/50">
                <p className="text-xs text-gray-400 mb-1">
                  USDT Balance
                </p>
                <p className="text-xl font-bold text-blue-600">
                  ${parseFloat(coldWallet.usdtBalance).toFixed(2)}
                </p>
              </div>
              <div className="p-4 rounded-xl bg-gray-900/50">
                <p className="text-xs text-gray-400 mb-1">
                  Allocation
                </p>
                <p className="text-xl font-bold text-white">
                  80-95%
                </p>
              </div>
              <div className="p-4 rounded-xl bg-gray-900/50">
                <p className="text-xs text-gray-400 mb-1">
                  Security
                </p>
                <p className="text-xl font-bold text-white">
                  Multi-sig
                </p>
              </div>
              <div className="p-4 rounded-xl bg-gray-900/50">
                <p className="text-xs text-gray-400 mb-1">
                  Storage
                </p>
                <p className="text-sm font-medium text-white">
                  Hardware Wallet
                </p>
              </div>
            </div>
            
            <div className="flex gap-3">
              <button
                onClick={transferToHot}
                className="flex-1 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-medium flex items-center justify-center gap-2"
              >
                <Zap className="h-4 w-4" />
                Transfer to Hot
              </button>
            </div>
          </div>
        </div>

        {/* Security Notice */}
        <div className="rounded-xl p-4 bg-yellow-900/20 border border-yellow-700">
          <div className="flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-yellow-500 flex-shrink-0 mt-0.5" />
            <div>
              <h3 className={`font-semibold mb-1 ${theme === 'dark' ? 'text-yellow-400' : 'text-yellow-800'}`}>
                Security Recommendations
              </h3>
              <ul className={`text-sm ${theme === 'dark' ? 'text-yellow-300' : 'text-yellow-700'} space-y-1`}>
                <li>• Keep your cold wallet seed phrase offline and in a secure location</li>
                <li>• Use multi-signature for large transfers from cold wallet</li>
                <li>• Enable 2FA on your exchange accounts</li>
                <li>• Regularly audit your wallet addresses</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
