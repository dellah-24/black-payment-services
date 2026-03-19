'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { 
  History, 
  ArrowLeft, 
  ArrowRight,
  ArrowUpRight, 
  ArrowDownLeft, 
  ExternalLink,
  Wallet,
  Filter,
  Search,
  Clock,
  CheckCircle,
  AlertCircle
} from 'lucide-react';

interface Transaction {
  id: string;
  type: 'send' | 'receive' | 'p2p_buy' | 'p2p_sell';
  amount: string;
  to?: string;
  from?: string;
  hash: string;
  timestamp: string;
  status: 'pending' | 'confirmed' | 'failed';
}

export default function HistoryPage() {
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');
  const [account, setAccount] = useState<string | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [filter, setFilter] = useState<'all' | 'send' | 'receive' | 'p2p'>('all');
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    const savedTheme = localStorage.getItem('theme') as 'dark' | 'light' | null;
    if (savedTheme) setTheme(savedTheme);
    
    const savedAccount = localStorage.getItem('account');
    if (savedAccount) setAccount(savedAccount);

    // Load transactions from localStorage
    const savedTransactions = localStorage.getItem('transactions');
    if (savedTransactions) {
      setTransactions(JSON.parse(savedTransactions));
    } else {
      // Demo transactions
      const demoTransactions: Transaction[] = [
        {
          id: '1',
          type: 'receive',
          amount: '500',
          from: '0x742d35Cc6634C0532925a3b844Bc9e7595f12eB3',
          hash: '0x1234567890abcdef1234567890abcdef12345678',
          timestamp: new Date(Date.now() - 3600000).toISOString(),
          status: 'confirmed',
        },
        {
          id: '2',
          type: 'send',
          amount: '250',
          to: '0x9876543210fedcba9876543210fedcba98765432',
          hash: '0xabcdef1234567890abcdef1234567890abcdef12',
          timestamp: new Date(Date.now() - 86400000).toISOString(),
          status: 'confirmed',
        },
        {
          id: '3',
          type: 'p2p_buy',
          amount: '1000',
          from: '0xabc123def456',
          hash: '0x111222333444555666777888999aaabbbcccddd',
          timestamp: new Date(Date.now() - 172800000).toISOString(),
          status: 'confirmed',
        },
        {
          id: '4',
          type: 'send',
          amount: '100',
          to: '0xdef456ghi789',
          hash: '0xaaabbbcccdddeeefff000111222333444555666',
          timestamp: new Date(Date.now() - 259200000).toISOString(),
          status: 'confirmed',
        },
      ];
      setTransactions(demoTransactions);
    }
  }, []);

  const filteredTransactions = transactions.filter(tx => {
    if (filter !== 'all') {
      if (filter === 'send' && tx.type !== 'send') return false;
      if (filter === 'receive' && tx.type !== 'receive') return false;
      if (filter === 'p2p' && !tx.type.startsWith('p2p')) return false;
    }
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      return (
        tx.hash.toLowerCase().includes(term) ||
        tx.amount.includes(term) ||
        (tx.to && tx.to.toLowerCase().includes(term)) ||
        (tx.from && tx.from.toLowerCase().includes(term))
      );
    }
    return true;
  });

  const getTypeIcon = (type: Transaction['type']) => {
    switch (type) {
      case 'send':
        return <ArrowUpRight className="h-5 w-5 text-red-500" />;
      case 'receive':
        return <ArrowDownLeft className="h-5 w-5 text-green-500" />;
      case 'p2p_buy':
        return <ArrowDownLeft className="h-5 w-5 text-blue-500" />;
      case 'p2p_sell':
        return <ArrowUpRight className="h-5 w-5 text-orange-500" />;
      default:
        return <History className="h-5 w-5" />;
    }
  };

  const getTypeLabel = (type: Transaction['type']) => {
    switch (type) {
      case 'send':
        return 'Sent';
      case 'receive':
        return 'Received';
      case 'p2p_buy':
        return 'P2P Buy';
      case 'p2p_sell':
        return 'P2P Sell';
      default:
        return 'Unknown';
    }
  };

  const formatAddress = (address: string | undefined) => {
    if (!address) return '';
    return `${address.slice(0, 8)}...${address.slice(-6)}`;
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
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="flex items-center mb-8">
          <Link href="/" className="p-2 rounded-lg bg-gray-800/50 hover:bg-gray-700/50 transition-colors mr-4">
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <h1 className="text-2xl font-bold text-white">
            Transaction History
          </h1>
        </div>

        {/* Filters */}
        <div className="rounded-2xl bg-gray-800/50 backdrop-blur-sm border border-gray-700/50 p-4 mb-6">
          <div className="flex flex-col md:flex-row gap-4">
            {/* Search */}
            <div className="relative flex-1">
              <Search className={`absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`} />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search by address, hash, or amount..."
                className={`w-full pl-10 pr-4 py-2 rounded-lg border ${
                  theme === 'dark' 
                    ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400' 
                    : 'bg-gray-50 border-gray-300 text-gray-900 placeholder-gray-500'
                }`}
              />
            </div>
            
            {/* Filter Tabs */}
            <div className="flex gap-2 overflow-x-auto">
              {[
                { id: 'all', label: 'All' },
                { id: 'send', label: 'Sent' },
                { id: 'receive', label: 'Received' },
                { id: 'p2p', label: 'P2P' },
              ].map((f) => (
                <button
                  key={f.id}
                  onClick={() => setFilter(f.id as any)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
                    filter === f.id
                      ? 'bg-primary-600 text-white'
                      : theme === 'dark'
                      ? 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Transaction List */}
        <div className="rounded-2xl bg-gray-800/50 backdrop-blur-sm border border-gray-700/50 overflow-hidden">
          {filteredTransactions.length === 0 ? (
            <div className="p-8 text-center">
              <History className={`h-12 w-12 mx-auto mb-4 ${theme === 'dark' ? 'text-gray-600' : 'text-gray-400'}`} />
              <p className={`${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
                No transactions found
              </p>
            </div>
          ) : (
            <div className="divide-y divide-gray-700">
              {filteredTransactions.map((tx) => (
                <div key={tx.id} className="p-4 hover:bg-opacity-50 transition-colors">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className={`p-2 rounded-full ${
                        tx.type === 'send' 
                          ? 'bg-red-500/20' 
                          : tx.type === 'receive'
                          ? 'bg-green-500/20'
                          : 'bg-blue-500/20'
                      }`}>
                        {getTypeIcon(tx.type)}
                      </div>
                      <div>
                        <p className={`font-medium ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                          {getTypeLabel(tx.type)}
                        </p>
                        <p className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
                          {tx.type === 'send' ? `To: ${formatAddress(tx.to)}` : `From: ${formatAddress(tx.from)}`}
                        </p>
                      </div>
                    </div>
                    
                    <div className="text-right">
                      <p className={`font-bold ${
                        tx.type === 'send' ? 'text-red-500' : 'text-green-500'
                      }`}>
                        {tx.type === 'send' ? '-' : '+'}{tx.amount} USDT
                      </p>
                      <div className="flex items-center gap-2 justify-end">
                        <span className={`text-xs ${
                          tx.status === 'confirmed' ? 'text-green-500' : 
                          tx.status === 'pending' ? 'text-yellow-500' : 'text-red-500'
                        }`}>
                          {tx.status === 'confirmed' ? (
                            <CheckCircle className="h-3 w-3 inline" />
                          ) : (
                            <Clock className="h-3 w-3 inline" />
                          )} {tx.status}
                        </span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="mt-2 flex items-center justify-between">
                    <p className={`text-xs ${theme === 'dark' ? 'text-gray-500' : 'text-gray-400'}`}>
                      {new Date(tx.timestamp).toLocaleString()}
                    </p>
                    <a
                      href={`https://tronscan.org/tx/${tx.hash}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-primary-600 hover:underline flex items-center gap-1"
                    >
                      View on Explorer
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Stats Summary */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-8">
          <div className={`rounded-xl p-4 ${theme === 'dark' ? 'bg-gray-800' : 'bg-white'}`}>
            <p className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
              Total Sent
            </p>
            <p className="text-xl font-bold text-red-500">
              {transactions.filter(t => t.type === 'send').reduce((acc, t) => acc + parseFloat(t.amount), 0)} USDT
            </p>
          </div>
          <div className={`rounded-xl p-4 ${theme === 'dark' ? 'bg-gray-800' : 'bg-white'}`}>
            <p className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
              Total Received
            </p>
            <p className="text-xl font-bold text-green-500">
              {transactions.filter(t => t.type === 'receive' || t.type === 'p2p_buy').reduce((acc, t) => acc + parseFloat(t.amount), 0)} USDT
            </p>
          </div>
          <div className={`rounded-xl p-4 ${theme === 'dark' ? 'bg-gray-800' : 'bg-white'}`}>
            <p className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
              Total Transactions
            </p>
            <p className="text-xl font-bold text-primary-600">
              {transactions.length}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
