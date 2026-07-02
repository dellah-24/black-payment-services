'use client';

interface WalletActionsProps {
  onSend: () => void;
  onReceive: () => void;
  onSwap: () => void;
  disabled?: boolean;
}

export function WalletActions({ onSend, onReceive, onSwap, disabled = false }: WalletActionsProps) {
  return (
    <div className="wallet-actions">
      <button onClick={onSend} disabled={disabled} className="action-button send">
        Send
      </button>
      <button onClick={onReceive} disabled={disabled} className="action-button receive">
        Receive
      </button>
      <button onClick={onSwap} disabled={disabled} className="action-button swap">
        Swap
      </button>
    </div>
  );
}
