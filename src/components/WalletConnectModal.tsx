'use client';

import { ChainKey } from '@/config/chains';
import { getChainConfig, SUPPORTED_CHAINS } from '@/config/chains';
import { ConnectWalletPrompt } from './ConnectWalletPrompt';

interface WalletConnectModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConnect: (chain: ChainKey) => void;
  isConnecting: boolean;
}

export function WalletConnectModal({ isOpen, onClose, onConnect, isConnecting }: WalletConnectModalProps) {
  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Connect Wallet</h2>
          <button onClick={onClose} className="modal-close">×</button>
        </div>
        <div className="modal-body">
          <ConnectWalletPrompt onConnect={onConnect} isConnecting={isConnecting} />
        </div>
      </div>
    </div>
  );
}
