'use client';

import { WalletChain } from '@/wallet/types';
import { getChainConfig, SUPPORTED_CHAINS } from '@/config/chains';
import { useWalletStore } from '@/stores/walletStore';

export function Navigation() {
  const { chain, isConnected } = useWalletStore();

  return (
    <nav className="navigation">
      <div className="nav-brand">
        <h1>BlackPayments Wallet</h1>
      </div>
      <div className="nav-links">
        <a href="/wallet">Wallet</a>
        <a href="/send">Send</a>
        <a href="/payments">Payments</a>
        <a href="/p2p">P2P</a>
        <a href="/defi">DeFi</a>
        <a href="/settings">Settings</a>
      </div>
      <div className="nav-status">
        {isConnected && chain ? (
          <span className="chain-badge">
            {getChainConfig(chain).name} ({getChainConfig(chain).symbol})
          </span>
        ) : (
          <span className="disconnected">Not Connected</span>
        )}
      </div>
    </nav>
  );
}
