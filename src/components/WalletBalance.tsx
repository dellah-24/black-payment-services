'use client';

import { WalletChain } from '@/wallet/types';
import { getChainConfig } from '@/config/chains';

interface WalletBalanceProps {
  balance: string;
  usdtBalance: string;
  chain: WalletChain | null;
  isLoading?: boolean;
}

export function WalletBalance({ balance, usdtBalance, chain, isLoading = false }: WalletBalanceProps) {
  if (isLoading) {
    return (
      <div className="wallet-balance">
        <div className="balance-skeleton">
          <div className="skeleton-line" style={{ width: '120px', height: '32px' }} />
          <div className="skeleton-line" style={{ width: '80px', height: '20px' }} />
        </div>
      </div>
    );
  }

  const chainName = chain ? getChainConfig(chain).name : 'Not Connected';

  return (
    <div className="wallet-balance">
      <div className="balance-main">
        <span className="balance-label">USDT Balance</span>
        <span className="balance-amount">{parseFloat(usdtBalance).toFixed(6)}</span>
      </div>
      <div className="balance-secondary">
        <span className="native-label">Native</span>
        <span className="native-amount">{parseFloat(balance).toFixed(6)}</span>
      </div>
      <div className="balance-chain">
        <span className="chain-label">Chain:</span>
        <span className="chain-name">{chainName}</span>
      </div>
    </div>
  );
}
