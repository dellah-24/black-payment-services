'use client';

import { useState } from 'react';
import { ethers } from 'ethers';
import { 
  Wallet, 
  Wallet as WalletIcon,
  Key, 
  RefreshCw,
  Loader2,
  X,
  ExternalLink,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import { showToast } from './Toast';
import { walletStorage } from '@/lib/secureWalletStorage';

type WalletOption = 'metamask' | 'walletconnect' | 'create' | 'import';

interface WalletConnectModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConnect: (account: string, type: string) => void;
}

export function WalletConnectModal({ isOpen, onClose, onConnect }: WalletConnectModalProps) {
  const [loading, setLoading] = useState<WalletOption | null>(null);
  const [importInput, setImportInput] = useState('');
  const [showImport, setShowImport] = useState(false);

  if (!isOpen) return null;

  const connectMetaMask = async () => {
    setLoading('metamask');
    try {
      if (typeof window.ethereum === 'undefined') {
        showToast('error', 'MetaMask not installed');
        return;
      }

      const provider = new ethers.BrowserProvider(window.ethereum);
      await provider.send('eth_requestAccounts', []);
      const accounts = await provider.listAccounts();
      
      if (accounts.length > 0) {
        const account = accounts[0].address;
        // Store connection type only (not private key for MetaMask)
        localStorage.setItem('bp_account', account);
        localStorage.setItem('bp_connection_type', 'metamask');
        onConnect(account, 'metamask');
        showToast('success', 'MetaMask connected!');
        onClose();
      }
    } catch (err) {
      console.error('MetaMask connection failed:', err);
      showToast('error', 'Failed to connect MetaMask');
    } finally {
      setLoading(null);
    }
  };

  const createWallet = async () => {
    setLoading('create');
    try {
      const wallet = ethers.Wallet.createRandom();
      const mnemonicPhrase = (wallet as any).mnemonic?.phrase || '';
      
      // Store encrypted in Supabase (secure cloud storage)
      const stored = await walletStorage.storeWallet(
        wallet.address,
        wallet.privateKey,
        mnemonicPhrase || undefined
      );
      
      if (!stored) {
        showToast('error', 'Failed to save wallet to cloud');
        setLoading(null);
        return;
      }
      
      localStorage.setItem('bp_connection_type', 'created');
      
      // Show seed phrase for backup
      showToast('success', `Wallet created! Save this seed phrase: ${mnemonicPhrase}`);
      onConnect(wallet.address, 'created');
      onClose();
    } catch (err) {
      showToast('error', 'Failed to create wallet');
    } finally {
      setLoading(null);
    }
  };

  const importWallet = async () => {
    if (!importInput.trim()) {
      showToast('error', 'Please enter private key or seed phrase');
      return;
    }

    setLoading('import');
    try {
      let wallet;
      const input = importInput.trim();
      const words = input.split(/\s+/);
      let mnemonicPhrase: string | undefined;

      if (words.length === 12 || words.length === 24) {
        // Mnemonic
        wallet = ethers.Wallet.fromPhrase(input);
        mnemonicPhrase = input;
      } else {
        // Private key
        wallet = new ethers.Wallet(input);
      }

      // Store encrypted in Supabase (secure cloud storage)
      const stored = await walletStorage.storeWallet(
        wallet.address,
        wallet.privateKey,
        mnemonicPhrase
      );
      
      if (!stored) {
        showToast('error', 'Failed to save wallet to cloud');
        setLoading(null);
        return;
      }
      
      localStorage.setItem('bp_connection_type', 'imported');
      
      showToast('success', 'Wallet imported and saved to cloud!');
      onConnect(wallet.address, 'imported');
      onClose();
    } catch (err) {
      console.error('Import failed:', err);
      showToast('error', 'Invalid private key or seed phrase');
    } finally {
      setLoading(null);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />
      
      {/* Modal */}
      <div className="relative w-full max-w-md bg-gray-900 rounded-3xl border border-gray-800 shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-800">
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <WalletIcon className="h-6 w-6 text-indigo-400" />
            Connect Wallet
          </h2>
          <button 
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-gray-800 text-gray-400 hover:text-white transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          {!showImport ? (
            <>
              {/* MetaMask */}
              <button
                onClick={connectMetaMask}
                disabled={loading === 'metamask'}
                className="w-full flex items-center gap-4 p-4 rounded-2xl bg-gray-800/50 hover:bg-gray-800 border border-gray-700 hover:border-gray-600 transition-all group disabled:opacity-50"
              >
                <div className="w-12 h-12 rounded-xl bg-orange-500/20 flex items-center justify-center">
                  {loading === 'metamask' ? (
                    <Loader2 className="h-6 w-6 text-orange-400 animate-spin" />
                  ) : (
                    <span className="text-2xl">🦊</span>
                  )}
                </div>
                <div className="flex-1 text-left">
                  <p className="font-semibold text-white">MetaMask</p>
                  <p className="text-sm text-gray-400">Connect using browser extension</p>
                </div>
                <ExternalLink className="h-5 w-5 text-gray-500 group-hover:text-gray-300" />
              </button>

              {/* WalletConnect */}
              <button
                onClick={() => showToast('info', 'WalletConnect coming soon')}
                disabled
                className="w-full flex items-center gap-4 p-4 rounded-2xl bg-gray-800/30 hover:bg-gray-800 border border-gray-700/50 transition-all opacity-50 cursor-not-allowed"
              >
                <div className="w-12 h-12 rounded-xl bg-blue-500/20 flex items-center justify-center">
                  <span className="text-2xl">🔗</span>
                </div>
                <div className="flex-1 text-left">
                  <p className="font-semibold text-white">WalletConnect</p>
                  <p className="text-sm text-gray-400">Scan with mobile wallet</p>
                </div>
                <span className="text-xs text-gray-500">Coming Soon</span>
              </button>

              {/* Divider */}
              <div className="flex items-center gap-4 py-2">
                <div className="flex-1 h-px bg-gray-800" />
                <span className="text-sm text-gray-500">OR</span>
                <div className="flex-1 h-px bg-gray-800" />
              </div>

              {/* Create Wallet */}
              <button
                onClick={createWallet}
                disabled={loading === 'create'}
                className="w-full flex items-center gap-4 p-4 rounded-2xl bg-gradient-to-r from-indigo-600/20 to-purple-600/20 hover:from-indigo-600/30 hover:to-purple-600/30 border border-indigo-500/30 transition-all disabled:opacity-50"
              >
                <div className="w-12 h-12 rounded-xl bg-indigo-500/20 flex items-center justify-center">
                  {loading === 'create' ? (
                    <Loader2 className="h-6 w-6 text-indigo-400 animate-spin" />
                  ) : (
                    <Wallet className="h-6 w-6 text-indigo-400" />
                  )}
                </div>
                <div className="flex-1 text-left">
                  <p className="font-semibold text-white">Create New Wallet</p>
                  <p className="text-sm text-gray-400">Generate a new wallet</p>
                </div>
                <Key className="h-5 w-5 text-gray-500" />
              </button>

              {/* Import Wallet */}
              <button
                onClick={() => setShowImport(true)}
                className="w-full flex items-center gap-4 p-4 rounded-2xl bg-gray-800/30 hover:bg-gray-800 border border-gray-700/50 transition-all"
              >
                <div className="w-12 h-12 rounded-xl bg-gray-700/50 flex items-center justify-center">
                  <RefreshCw className="h-6 w-6 text-gray-400" />
                </div>
                <div className="flex-1 text-left">
                  <p className="font-semibold text-white">Import Existing</p>
                  <p className="text-sm text-gray-400">Use private key or seed phrase</p>
                </div>
              </button>
            </>
          ) : (
            <>
              {/* Import Form */}
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Private Key or Seed Phrase
                  </label>
                  <textarea
                    value={importInput}
                    onChange={(e) => setImportInput(e.target.value)}
                    placeholder="Enter 0x... private key OR 12/24 word seed phrase"
                    className="w-full h-32 px-4 py-3 rounded-xl bg-gray-800 border border-gray-700 text-white placeholder-gray-500 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 resize-none font-mono text-sm"
                  />
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={() => setShowImport(false)}
                    className="flex-1 px-4 py-3 rounded-xl bg-gray-800 text-gray-300 hover:bg-gray-700 transition-colors"
                  >
                    Back
                  </button>
                  <button
                    onClick={importWallet}
                    disabled={loading === 'import' || !importInput.trim()}
                    className="flex-1 px-4 py-3 rounded-xl bg-indigo-600 text-white hover:bg-indigo-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    {loading === 'import' && <Loader2 className="h-4 w-4 animate-spin" />}
                    Import Wallet
                  </button>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Security Notice */}
        <div className="p-4 bg-yellow-500/10 border-t border-yellow-500/20">
          <div className="flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-yellow-400 flex-shrink-0 mt-0.5" />
            <p className="text-xs text-yellow-200/80">
              Never share your seed phrase or private key. BlackPayments will NEVER ask for this information.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
