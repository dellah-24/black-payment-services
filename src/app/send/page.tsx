'use client';

import { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import Link from 'next/link';
import { 
  Send, 
  ArrowLeft, 
  Copy, 
  Check, 
  ExternalLink,
  Wallet,
  AlertCircle,
  Zap,
  ArrowRight,
  QrCode,
  Shield,
  Loader2
} from 'lucide-react';
import { showToast } from '@/components/Toast';
import { walletStorage } from '@/lib/secureWalletStorage';

// Chain types
type ChainKey = 'tron' | 'ethereum' | 'bsc' | 'arbitrum' | 'solana';

interface ChainConfig {
  name: string;
  symbol: string;
  rpcUrl: string;
  explorerUrl: string;
  chainId: number;
  usdtAddress: string;
}

const CHAINS: Record<ChainKey, ChainConfig> = {
  tron: {
    name: 'TRON',
    symbol: 'TRX',
    rpcUrl: 'https://api.trongrid.io',
    explorerUrl: 'https://tronscan.org',
    chainId: 0,
    usdtAddress: 'TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t',
  },
  ethereum: {
    name: 'Ethereum',
    symbol: 'ETH',
    rpcUrl: 'https://eth.llamarpc.com',
    explorerUrl: 'https://etherscan.io',
    chainId: 1,
    usdtAddress: '0xdAC17F958D2ee523a2206206994597C13D831ec7',
  },
  bsc: {
    name: 'BNB Chain',
    symbol: 'BNB',
    rpcUrl: 'https://bsc-dataseed.binance.org',
    explorerUrl: 'https://bscscan.com',
    chainId: 56,
    usdtAddress: '0x55d398326f99059fF775485246999027B3197955',
  },
  arbitrum: {
    name: 'Arbitrum',
    symbol: 'ETH',
    rpcUrl: 'https://arb1.arbitrum.io/rpc',
    explorerUrl: 'https://arbiscan.io',
    chainId: 42161,
    usdtAddress: '0xFd086bC7CD5C481DCC93C85BD42c402bDe6B9614',
  },
  solana: {
    name: 'Solana',
    symbol: 'SOL',
    rpcUrl: 'https://api.mainnet-beta.solana.com',
    explorerUrl: 'https://solscan.io',
    chainId: 0,
    usdtAddress: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
  },
};

const USDT_ABI = [
  'function balanceOf(address owner) view returns (uint256)',
  'function transfer(address to, uint256 amount) returns (boolean)',
  'function decimals() view returns (uint8)',
];

export default function SendPage() {
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');
  const [account, setAccount] = useState<string | null>(null);
  const [selectedChain, setSelectedChain] = useState<ChainKey>('tron');
  const [recipient, setRecipient] = useState('');
  const [amount, setAmount] = useState('');
  const [estimatedFee, setEstimatedFee] = useState<string>('0');
  const [isLoading, setIsLoading] = useState(false);
  const [txHash, setTxHash] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showConfirm, setShowConfirm] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const savedTheme = localStorage.getItem('theme') as 'dark' | 'light' | null;
    if (savedTheme) setTheme(savedTheme);
    
    // Get account from Supabase
    const savedAccount = walletStorage.getCurrentAccount();
    if (savedAccount) setAccount(savedAccount);
  }, []);

  useEffect(() => {
    if (recipient && amount && selectedChain !== 'tron' && selectedChain !== 'solana') {
      estimateFee();
    } else {
      setEstimatedFee('0.001');
    }
  }, [recipient, amount, selectedChain]);

  const estimateFee = async () => {
    try {
      const chain = CHAINS[selectedChain];
      const provider = new ethers.JsonRpcProvider(chain.rpcUrl.replace('YOUR_API_KEY', ''));
      const feeData = await provider.getFeeData();
      setEstimatedFee(ethers.formatEther(feeData.gasPrice || BigInt(0)));
    } catch (err) {
      setEstimatedFee('0.0001');
    }
  };

  const handleSend = async () => {
    if (!account || !recipient || !amount) return;
    
    // Validate recipient address
    if (selectedChain !== 'tron' && selectedChain !== 'solana') {
      if (!ethers.isAddress(recipient)) {
        setError('Invalid recipient address');
        showToast('error', 'Invalid recipient address');
        return;
      }
    }
    
    // Validate amount
    const amountNum = parseFloat(amount);
    if (isNaN(amountNum) || amountNum <= 0) {
      setError('Please enter a valid amount');
      showToast('error', 'Please enter a valid amount');
      return;
    }
    
    setIsLoading(true);
    setError(null);

    try {
      if (selectedChain === 'tron' || selectedChain === 'solana') {
        setError('TRC-20 and SPL transfers require special handling. Please use a different network.');
        showToast('warning', 'Please use a different network for this transaction');
        setIsLoading(false);
        return;
      }

      const chain = CHAINS[selectedChain];
      
      // Get private key from Supabase
      const walletData = await walletStorage.retrieveWallet(account);
      
      if (!walletData) {
        setError('Wallet not found. Please create or import a wallet first.');
        showToast('error', 'Wallet not found');
        setIsLoading(false);
        return;
      }
      
      const privateKey = walletData.privateKey;
      
      // Use internal wallet signer
      const provider = new ethers.JsonRpcProvider(chain.rpcUrl.replace('YOUR_API_KEY', ''));
      const signer = new ethers.Wallet(privateKey, provider);
      
      const usdtContract = new ethers.Contract(chain.usdtAddress, USDT_ABI, signer);
      const amountInWei = ethers.parseUnits(amount, 6);
      
      const tx = await usdtContract.transfer(recipient, amountInWei);
      await tx.wait();
      
      setTxHash(tx.hash);
      showToast('success', `Successfully sent ${amount} USDT!`);
      
      // Save to history
      const txHistory = JSON.parse(localStorage.getItem('transactions') || '[]');
      txHistory.unshift({
        id: Date.now().toString(),
        type: 'send',
        amount,
        to: recipient,
        hash: tx.hash,
        timestamp: new Date().toISOString(),
      });
      localStorage.setItem('transactions', JSON.stringify(txHistory));
      
    } catch (err: any) {
      setError(err.message || 'Transaction failed');
      showToast('error', err.message || 'Transaction failed');
    } finally {
      setIsLoading(false);
    }
  };

  const copyAddress = () => {
    navigator.clipboard.writeText(recipient);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const chain = CHAINS[selectedChain];

  if (!account) {
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

  if (txHash) {
    return (
      <div className="min-h-screen py-8">
        <div className="max-w-2xl mx-auto px-4">
          <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-green-900/50 to-gray-900 p-8 shadow-2xl border border-green-500/30 text-center">
            <div className="absolute top-0 right-0 w-64 h-64 bg-green-500/10 rounded-full blur-3xl" />
            <div className="relative">
              <div className="w-20 h-20 rounded-full bg-green-500/20 flex items-center justify-center mx-auto mb-6">
                <Check className="h-10 w-10 text-green-500" />
              </div>
              <h2 className="text-2xl font-bold text-white mb-2">
                Transaction Sent!
              </h2>
              <p className="text-gray-400 mb-6">
                Your USDT has been sent successfully
              </p>
              
              <div className="p-4 rounded-xl bg-gray-900/50 backdrop-blur-sm mb-6">
                <p className="text-xs text-gray-500 mb-1">Transaction Hash</p>
                <a 
                  href={`${chain.explorerUrl}/tx/${txHash}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-mono text-sm text-indigo-400 hover:underline flex items-center justify-center gap-2"
                >
                  {txHash.slice(0, 20)}...{txHash.slice(-20)}
                  <ExternalLink className="h-4 w-4" />
                </a>
              </div>
              
              <div className="flex gap-4 justify-center">
                <Link href="/" className="px-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl font-medium">
                  Back to Dashboard
                </Link>
                <button 
                  onClick={() => setTxHash(null)}
                  className="px-6 py-3 bg-white/10 text-white rounded-xl font-medium hover:bg-white/20 backdrop-blur-sm"
                >
                  Send Another
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen py-8">
      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="flex items-center mb-8">
          <Link href="/" className="p-2.5 rounded-xl bg-gray-800/50 hover:bg-gray-700/50 transition-colors mr-4">
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <h1 className="text-2xl font-bold bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent">
            Send USDT
          </h1>
        </div>

        <div className="relative overflow-hidden rounded-2xl bg-gray-800/50 backdrop-blur-sm border border-gray-700/50 p-6">
          <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/5 rounded-full blur-3xl pointer-events-none" />

          {/* Network Selection */}
          <div className="relative mb-6">
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Network
            </label>
            <select
              value={selectedChain}
              onChange={(e) => setSelectedChain(e.target.value as ChainKey)}
              className="w-full px-4 py-3.5 rounded-xl bg-gray-900/50 border border-gray-700 text-white appearance-none cursor-pointer"
            >
              <option value="tron">🔥 TRON (TRC-20) - Recommended</option>
              <option value="bsc">💎 BNB Chain (BEP-20)</option>
              <option value="ethereum">🔷 Ethereum (ERC-20)</option>
              <option value="arbitrum">🔵 Arbitrum</option>
            </select>
            {selectedChain === 'tron' && (
              <p className="mt-2 text-sm flex items-center gap-1 text-green-400">
                <Zap className="h-4 w-4" /> Lowest fees: ~$0.001 per transaction
              </p>
            )}
          </div>

          {/* Recipient Address */}
          <div className="relative mb-6">
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Recipient Address
            </label>
            <div className="relative">
              <input
                type="text"
                value={recipient}
                onChange={(e) => setRecipient(e.target.value)}
                placeholder="Enter wallet address"
                className="w-full px-4 py-3.5 pr-14 rounded-xl bg-gray-900/50 border border-gray-700 text-white placeholder-gray-500"
              />
              <button
                onClick={copyAddress}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-2 hover:bg-gray-700 rounded-lg transition-colors"
              >
                {copied ? <Check className="h-5 w-5 text-green-500" /> : <Copy className="h-5 w-5 text-gray-400" />}
              </button>
            </div>
          </div>

          {/* Amount */}
          <div className="relative mb-6">
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Amount (USDT)
            </label>
            <div className="relative">
              <input
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.00"
                className="w-full px-4 py-3.5 rounded-xl bg-gray-900/50 border border-gray-700 text-2xl font-bold text-white placeholder-gray-500"
              />
              <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 font-medium">
                USDT
              </span>
            </div>
          </div>

          {/* Fee Estimation */}
          <div className="p-4 rounded-xl bg-gray-900/50 backdrop-blur-sm mb-6 border border-gray-700/50">
            <div className="flex justify-between items-center">
              <span className="text-gray-400 flex items-center gap-2">
                <Shield className="h-4 w-4" /> Estimated Network Fee
              </span>
              <span className="font-medium text-white">
                ~{parseFloat(estimatedFee).toFixed(6)} {chain.symbol}
              </span>
            </div>
          </div>

          {/* Error Message */}
          {error && (
            <div className="mb-6 p-4 rounded-xl bg-red-500/10 border border-red-500/30 flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-red-500 flex-shrink-0" />
              <span className="text-red-400 text-sm">{error}</span>
            </div>
          )}

          {/* Send Button */}
          <button
            onClick={() => setShowConfirm(true)}
            disabled={!recipient || !amount || isLoading}
            className={`w-full py-4 rounded-xl font-bold text-lg transition-all ${
              !recipient || !amount || isLoading
                ? 'bg-gray-700 cursor-not-allowed opacity-50 text-gray-400'
                : 'bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white hover:scale-[1.02]'
            }`}
            aria-label="Review transaction"
          >
            {isLoading ? (
              <span className="flex items-center justify-center gap-2">
                <Loader2 className="h-5 w-5 animate-spin" />
                Processing...
              </span>
            ) : 'Review Transaction'}
          </button>
        </div>

        {/* Confirmation Modal */}
        {showConfirm && (
          <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="relative overflow-hidden rounded-2xl bg-gray-800 p-6 max-w-md w-full border border-gray-700">
              <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl" />
              
              <h3 className="text-xl font-bold text-white mb-4 relative">
                Confirm Transaction
              </h3>
              
              <div className="space-y-3 mb-6 relative">
                <div className="flex justify-between">
                  <span className="text-gray-400">Network</span>
                  <span className="text-white">{chain.name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">To</span>
                  <code className="text-sm text-gray-300">{recipient.slice(0, 10)}...{recipient.slice(-8)}</code>
                </div>
                <div className="flex justify-between font-bold">
                  <span className="text-white">Amount</span>
                  <span className="text-indigo-400">{amount} USDT</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-400">Fee</span>
                  <span className="text-gray-300">~{parseFloat(estimatedFee).toFixed(6)} {chain.symbol}</span>
                </div>
              </div>

              <div className="flex gap-3 relative">
                <button
                  onClick={() => setShowConfirm(false)}
                  className="flex-1 py-3 bg-gray-700 text-white rounded-xl font-medium hover:bg-gray-600"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSend}
                  disabled={isLoading}
                  className="flex-1 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl font-medium hover:from-indigo-500 hover:to-purple-500"
                >
                  {isLoading ? 'Sending...' : 'Confirm'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
