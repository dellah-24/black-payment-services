'use client';

import { useState, useEffect } from 'react';
import { 
  TransactionRecord, 
  getTransactionStatus,
  TransactionStatus 
} from '@/lib/walletUtils';
import { 
  Clock, 
  CheckCircle2, 
  XCircle, 
  ExternalLink, 
  RefreshCw,
  Loader2
} from 'lucide-react';

interface TransactionStatusProps {
  transaction: TransactionRecord;
  onStatusChange?: (status: TransactionStatus) => void;
}

export function TransactionStatusCard({ transaction, onStatusChange }: TransactionStatusProps) {
  const [status, setStatus] = useState<TransactionStatus>(transaction.status);
  const [loading, setLoading] = useState(transaction.status === 'pending');

  // Poll for status updates if pending
  useEffect(() => {
    if (status !== 'pending') return;

    const pollStatus = async () => {
      try {
        const newStatus = await getTransactionStatus(transaction.chain, transaction.hash);
        setStatus(newStatus);
        
        if (newStatus !== 'pending') {
          setLoading(false);
          onStatusChange?.(newStatus);
        }
      } catch (error) {
        console.error('Failed to check transaction status:', error);
      }
    };

    // Initial check
    pollStatus();

    // Poll every 10 seconds
    const interval = setInterval(pollStatus, 10000);

    return () => clearInterval(interval);
  }, [transaction.hash, transaction.chain, status, onStatusChange]);

  const getStatusConfig = () => {
    switch (status) {
      case 'pending':
        return {
          icon: <Clock className="h-5 w-5 text-yellow-500" />,
          label: 'Pending',
          color: 'bg-yellow-500/10 border-yellow-500/30',
          textColor: 'text-yellow-400',
        };
      case 'confirmed':
        return {
          icon: <CheckCircle2 className="h-5 w-5 text-green-500" />,
          label: 'Confirmed',
          color: 'bg-green-500/10 border-green-500/30',
          textColor: 'text-green-400',
        };
      case 'failed':
        return {
          icon: <XCircle className="h-5 w-5 text-red-500" />,
          label: 'Failed',
          color: 'bg-red-500/10 border-red-500/30',
          textColor: 'text-red-400',
        };
    }
  };

  const config = getStatusConfig();

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleString();
  };

  return (
    <div className={`p-4 rounded-xl border ${config.color} backdrop-blur-sm`}>
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-white/5">
            {loading ? (
              <Loader2 className="h-5 w-5 text-yellow-500 animate-spin" />
            ) : (
              config.icon
            )}
          </div>
          <div>
            <div className={`font-semibold ${config.textColor}`}>
              {config.label}
            </div>
            <div className="text-xs text-gray-400 mt-0.5">
              {formatTime(transaction.timestamp)}
            </div>
          </div>
        </div>

        <a
          href={`${transaction.explorerUrl}/tx/${transaction.hash}`}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1 text-xs text-indigo-400 hover:text-indigo-300"
        >
          View
          <ExternalLink className="h-3 w-3" />
        </a>
      </div>

      <div className="mt-3 pt-3 border-t border-white/5">
        <div className="flex justify-between text-sm">
          <span className="text-gray-400">
            {transaction.type === 'send' ? 'To:' : 'From:'}
          </span>
          <code className="text-gray-300 font-mono">
            {transaction.type === 'send' 
              ? `${transaction.to.slice(0, 8)}...${transaction.to.slice(-6)}`
              : `${transaction.from.slice(0, 8)}...${transaction.from.slice(-6)}`
            }
          </code>
        </div>
        <div className="flex justify-between text-sm mt-1">
          <span className="text-gray-400">Amount:</span>
          <span className="text-white font-medium">{transaction.amount} {transaction.token}</span>
        </div>
        <div className="flex justify-between text-sm mt-1">
          <span className="text-gray-400">Network:</span>
          <span className="text-gray-300 capitalize">{transaction.chain}</span>
        </div>
      </div>
    </div>
  );
}

// Component for showing multiple transactions
interface TransactionHistoryListProps {
  transactions: TransactionRecord[];
}

export function TransactionHistoryList({ transactions }: TransactionHistoryListProps) {
  const [filter, setFilter] = useState<'all' | TransactionStatus>('all');

  const filteredTransactions = transactions.filter(
    (tx) => filter === 'all' || tx.status === filter
  );

  if (transactions.length === 0) {
    return (
      <div className="text-center py-8 text-gray-400">
        <p>No transactions yet</p>
        <p className="text-sm mt-1">Your transaction history will appear here</p>
      </div>
    );
  }

  return (
    <div>
      {/* Filter */}
      <div className="flex gap-2 mb-4">
        {(['all', 'pending', 'confirmed', 'failed'] as const).map((status) => (
          <button
            key={status}
            onClick={() => setFilter(status)}
            className={`px-3 py-1.5 rounded-lg text-sm capitalize transition-colors ${
              filter === status
                ? 'bg-indigo-600 text-white'
                : 'bg-gray-700/50 text-gray-400 hover:bg-gray-700'
            }`}
          >
            {status}
          </button>
        ))}
      </div>

      {/* List */}
      <div className="space-y-3">
        {filteredTransactions.map((tx) => (
          <TransactionStatusCard key={tx.id} transaction={tx} />
        ))}
      </div>
    </div>
  );
}
