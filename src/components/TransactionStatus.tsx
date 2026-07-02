'use client';

import { ChainKey } from '@/config/chains';
import { getChainConfig } from '@/config/chains';

export type TransactionStatusType = 'pending' | 'confirmed' | 'failed' | 'cancelled';

interface TransactionStatusProps {
  status: TransactionStatusType;
  hash?: string | undefined;
  chain?: ChainKey | undefined;
  amount?: string | undefined;
  to?: string | undefined;
  from?: string | undefined;
  timestamp?: string | undefined;
}

export function TransactionStatus({
  status,
  hash,
  chain,
  amount,
  to,
  from,
  timestamp,
}: TransactionStatusProps) {
  const getStatusColor = () => {
    switch (status) {
      case 'confirmed':
        return 'green';
      case 'failed':
      case 'cancelled':
        return 'red';
      case 'pending':
      default:
        return 'yellow';
    }
  };

  const getStatusLabel = () => {
    switch (status) {
      case 'confirmed':
        return 'Confirmed';
      case 'failed':
        return 'Failed';
      case 'cancelled':
        return 'Cancelled';
      case 'pending':
      default:
        return 'Pending';
    }
  };

  const explorerUrl = hash && chain ? `${getChainConfig(chain).explorerUrl}/tx/${hash}` : null;

  return (
    <div className={`transaction-status transaction-status-${status}`}>
      <div className="status-header">
        <span className={`status-badge ${getStatusColor()}`}>{getStatusLabel()}</span>
        {timestamp && <span className="timestamp">{new Date(timestamp).toLocaleString()}</span>}
      </div>

      {hash && (
        <div className="transaction-hash">
          <span>Hash: {hash.slice(0, 10)}...{hash.slice(-8)}</span>
          {explorerUrl && (
            <a href={explorerUrl} target="_blank" rel="noopener noreferrer" className="explorer-link">
              View on Explorer
            </a>
          )}
        </div>
      )}

      {amount && (
        <div className="transaction-amount">
          <span>Amount: {amount} USDT</span>
        </div>
      )}

      {(from || to) && (
        <div className="transaction-addresses">
          {from && <div>From: {from.slice(0, 10)}...{from.slice(-8)}</div>}
          {to && <div>To: {to.slice(0, 10)}...{to.slice(-8)}</div>}
        </div>
      )}
    </div>
  );
}
