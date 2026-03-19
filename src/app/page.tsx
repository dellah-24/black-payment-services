'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ethers } from 'ethers';
import Link from 'next/link';
import { 
  TrendingUp, 
  Shield, 
  ArrowUpRight, 
  ArrowDownLeft,
  Copy,
  Check,
  DollarSign,
  Lock,
  Flame,
  Zap,
  Activity,
  Users,
  CreditCard,
  Hexagon,
  Send,
  History,
  Settings,
  LogOut,
  QrCode,
  ExternalLink,
  Fingerprint,
  Layers,
  Target,
  Star,
  Award,
  CheckCircle2,
  Circle,
  ChevronRight,
  Wallet,
  Loader2,
  Key,
  Globe,
  Cloud,
  CloudOff,
  User
} from 'lucide-react';
import { showToast } from '@/components/Toast';
import { WalletConnectModal } from '@/components/WalletConnectModal';
import { walletStorage } from '@/lib/secureWalletStorage';
import { supabase } from '@/lib/supabaseClient';
import { profileApi } from '@/lib/profileApi';

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

export default function Dashboard() {
  const router = useRouter();
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');
  const [account, setAccount] = useState<string | null>(null);
  const [selectedChain, setSelectedChain] = useState<ChainKey>('tron');
  const [balance, setBalance] = useState<string>('0');
  const [usdtBalance, setUsdtBalance] = useState<string>('0');
  const [isLoading, setIsLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [showWalletModal, setShowWalletModal] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isAuthLoading, setIsAuthLoading] = useState(true);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [walletPassword, setWalletPassword] = useState('');
  const [pendingWalletAddress, setPendingWalletAddress] = useState<string | null>(null);

  // Handle password submission for wallet decryption
  const handlePasswordSubmit = async () => {
    if (!walletPassword || !pendingWalletAddress) return;
    
    try {
      const walletData = await walletStorage.retrieveWallet(pendingWalletAddress, walletPassword);
      if (walletData) {
        setAccount(pendingWalletAddress);
        setIsAuthenticated(true);
        setShowPasswordModal(false);
        setWalletPassword('');
        fetchBalances(pendingWalletAddress, selectedChain);
      } else {
        showToast('error', 'Invalid password or wallet not found');
      }
    } catch (e) {
      showToast('error', 'Failed to decrypt wallet');
    }
  };

  useEffect(() => {
    const checkAuth = async () => {
      const savedTheme = localStorage.getItem('theme') as 'dark' | 'light' | null;
      if (savedTheme) {
        setTheme(savedTheme);
      }
      
      // Check for Supabase Auth session first
      const { data: { session } } = await supabase.auth.getSession();
      
      if (session) {
        // User is logged in with Supabase Auth - get wallet address from profile
        try {
          // Get profile by user ID to find wallet address
          const profile = await profileApi.getByUserId(session.user.id);
          
          if (profile && profile.wallet_address) {
            const savedAccount = profile.wallet_address;
            
            // Try to retrieve wallet from Supabase - show password modal if needed
            try {
              const walletData = await walletStorage.retrieveWallet(savedAccount);
              if (walletData) {
                // Check if profile exists and has required fields
                const hasProfile = profile.first_name && profile.last_name && profile.email;
                
                if (hasProfile) {
                  setAccount(savedAccount);
                  setIsAuthenticated(true);
                  fetchBalances(savedAccount, selectedChain);
                } else {
                  // Has wallet but no complete profile - redirect to auth
                  router.push('/auth');
                }
              } else {
                // No wallet in storage - show password modal to decrypt
                setPendingWalletAddress(savedAccount);
                setShowPasswordModal(true);
              }
            } catch (e) {
              // Decryption error - show password modal
              setPendingWalletAddress(savedAccount);
              setShowPasswordModal(true);
            }
          } else {
            // Has auth session but no profile/wallet
            // Allow user to stay on home and create wallet from here
            console.log('User has auth but no profile - can create wallet from home');
          }
        } catch (e) {
          // Error getting profile - allow user to stay and create wallet from home
          console.warn('Profile fetch error, allowing access:', e);
        }
       } else {
         // Legacy: Check for existing wallet-only session
         const savedAccount = walletStorage.getCurrentAccount();
         if (savedAccount) {
           // Try to retrieve wallet from Supabase
           const walletData = await walletStorage.retrieveWallet(savedAccount);
           if (walletData) {
             // Check if profile exists and has required fields
             try {
               const profile = await profileApi.getByAddress(savedAccount);
               const hasProfile = profile && profile.first_name && profile.last_name && profile.email;
               
               if (hasProfile) {
                 setAccount(savedAccount);
                 setIsAuthenticated(true);
                 fetchBalances(savedAccount, selectedChain);
               } else {
                 // Has wallet but no profile - redirect to auth
                 router.push('/auth');
               }
             } catch (e) {
               // If profile check fails, allow access (for demo without Supabase)
               setAccount(savedAccount);
               setIsAuthenticated(true);
               fetchBalances(savedAccount, selectedChain);
             }
           } else {
             // Session invalid, redirect to auth
             walletStorage.clearSession();
             router.push('/auth');
           }
         } else {
           // No account, redirect to auth
           router.push('/auth');
         }
       }
      
      setIsAuthLoading(false);
    };
    
    checkAuth();
  }, []);

  const connectWallet = async () => {
    // Show wallet options modal
    setShowWalletModal(true);
  };

  const createNewWallet = async () => {
    setIsLoading(true);
    try {
      const wallet = ethers.Wallet.createRandom();
      setAccount(wallet.address);
      
      // Get mnemonic phrase - Wallet.createRandom() creates an HDWallet with mnemonic
      const mnemonicPhrase = (wallet as any).mnemonic?.phrase || '';
      
      // Store encrypted in Supabase (secure cloud storage)
      const stored = await walletStorage.storeWallet(
        wallet.address, 
        wallet.privateKey, 
        mnemonicPhrase || undefined
      );
      
      if (stored) {
        showToast('success', `Wallet created! Save this seed phrase: ${mnemonicPhrase || 'N/A'}`);
      } else {
        showToast('error', 'Failed to save wallet to cloud. Please try again.');
        return;
      }
      
      setBalance('0');
      setUsdtBalance('0');
    } catch (err) {
      console.error('Failed to create wallet');
      showToast('error', 'Failed to create wallet. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const importWallet = async () => {
    const input = prompt('Enter your private key (with 0x prefix) OR 12/24 word seed phrase:');
    if (!input) {
      showToast('error', 'Input is required');
      return;
    }
    setIsLoading(true);
    try {
      let wallet;
      const trimmed = input.trim();
      
      // Check if it's a seed phrase (12 or 24 words)
      const words = trimmed.split(/\s+/);
      let mnemonicPhrase: string | undefined;
      
      if (words.length === 12 || words.length === 24) {
        // It's a mnemonic
        wallet = ethers.Wallet.fromPhrase(trimmed);
        mnemonicPhrase = trimmed;
      } else {
        // It's a private key
        wallet = new ethers.Wallet(trimmed);
      }
      
      setAccount(wallet.address);
      
      // Store encrypted in Supabase
      const stored = await walletStorage.storeWallet(
        wallet.address, 
        wallet.privateKey, 
        mnemonicPhrase
      );
      
      if (stored) {
        showToast('success', 'Wallet imported and saved to cloud!');
      } else {
        showToast('error', 'Failed to save wallet to cloud.');
      }
      
      setBalance('0');
      setUsdtBalance('0');
      fetchBalances(wallet.address, selectedChain);
    } catch (err) {
      console.error('Failed to import wallet:', err);
      showToast('error', 'Invalid private key or seed phrase. Please check and try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchBalances = async (address: string, chainKey: ChainKey) => {
    if (chainKey === 'tron' || chainKey === 'solana') {
      setBalance('0');
      setUsdtBalance('0');
      return;
    }

    try {
      const chain = CHAINS[chainKey];
      const provider = new ethers.JsonRpcProvider(chain.rpcUrl.replace('YOUR_API_KEY', ''));
      
      const usdtContract = new ethers.Contract(chain.usdtAddress, USDT_ABI, provider);
      const usdtBal = await usdtContract.balanceOf(address);
      setUsdtBalance(ethers.formatUnits(usdtBal, 6));
    } catch (err) {
      console.error('Error fetching balances:', err);
    }
  };

  const copyAddress = () => {
    if (account) {
      navigator.clipboard.writeText(account);
      setCopied(true);
      showToast('success', 'Address copied to clipboard!');
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const disconnectWallet = async () => {
    if (confirm('Are you sure you want to sign out?')) {
      // Delete from Supabase
      if (account) {
        await walletStorage.deleteWallet(account);
      }
      walletStorage.clearSession();
      window.location.href = '/auth';
    }
  };

  const chain = CHAINS[selectedChain];

  // Features for the welcome screen
  const features = [
    { icon: Shield, title: 'Secure Escrow', desc: 'Your funds are protected with smart contracts', color: 'green' },
    { icon: Zap, title: 'Low Fees', desc: 'TRC-20 network for minimal transaction costs', color: 'yellow' },
    { icon: Users, title: 'P2P Trading', desc: 'Trade directly with verified users worldwide', color: 'blue' },
    { icon: Layers, title: 'Split Custody', desc: 'Hot & cold wallet security system', color: 'purple' },
  ];

  // Quick actions with icons
  const quickActions = [
    { icon: Send, label: 'Send USDT', href: '/send', color: 'blue', desc: 'Transfer to any address' },
    { icon: ArrowDownLeft, label: 'Receive', href: '/wallets', color: 'green', desc: 'Get your deposit address' },
    { icon: DollarSign, label: 'P2P Trade', href: '/p2p', color: 'orange', desc: 'Buy or sell USDT' },
    { icon: History, label: 'History', href: '/history', color: 'purple', desc: 'View all transactions' },
    { icon: User, label: 'Profile', href: '/profile', color: 'indigo', desc: 'Manage your account' },
  ];

  // Network options
  const networks = [
    { id: 'tron', name: 'TRON', symbol: 'TRX', emoji: '🔴', desc: 'Best for low fees', recommended: true },
    { id: 'bsc', name: 'BNB Chain', symbol: 'BNB', emoji: '🟡', desc: 'Fast & cheap' },
    { id: 'ethereum', name: 'Ethereum', symbol: 'ETH', emoji: '🔵', desc: 'Most popular' },
  ];

  // Show loading while checking authentication
  if (isAuthLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-900 to-indigo-950 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 rounded-full bg-indigo-600/20 flex items-center justify-center mx-auto mb-4 animate-pulse">
            <Wallet className="h-8 w-8 text-indigo-400" />
          </div>
          <p className="text-gray-400">Loading...</p>
        </div>
      </div>
    );
  }

  // Redirect if not authenticated
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-900 to-indigo-950 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 rounded-full bg-indigo-600/20 flex items-center justify-center mx-auto mb-4 animate-pulse">
            <Loader2 className="h-8 w-8 text-indigo-400 animate-spin" />
          </div>
          <p className="text-gray-400">Redirecting to sign in...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-900 to-indigo-950">
      {/* Password Modal */}
      {showPasswordModal && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50">
          <div className="bg-gray-800 rounded-xl p-6 w-full max-w-md mx-4">
            <h2 className="text-xl font-bold text-white mb-4">Enter Wallet Password</h2>
            <p className="text-gray-400 mb-4">Enter your password to decrypt your wallet from the cloud.</p>
            <input
              type="password"
              value={walletPassword}
              onChange={(e) => setWalletPassword(e.target.value)}
              placeholder="Wallet password"
              className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 mb-4"
              onKeyDown={(e) => e.key === 'Enter' && handlePasswordSubmit()}
            />
            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowPasswordModal(false);
                  setWalletPassword('');
                  router.push('/auth');
                }}
                className="flex-1 px-4 py-3 bg-gray-600 text-white rounded-lg hover:bg-gray-500 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handlePasswordSubmit}
                disabled={!walletPassword}
                className="flex-1 px-4 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Decrypt Wallet
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main content */}
      <main className="max-w-6xl mx-auto px-4 py-8">
        {!account ? (
          /* Welcome Screen with Visual Elements */
          <div className="space-y-12">
            {/* Hero Section */}
            <div className="text-center space-y-6">
              <div className="relative inline-block">
                <div className="absolute inset-0 bg-indigo-500 blur-3xl opacity-30 animate-pulse" />
                <div className="relative w-28 h-28 rounded-3xl bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 flex items-center justify-center shadow-2xl shadow-indigo-500/30">
                  <Wallet className="h-14 w-14 text-white" />
                </div>
              </div>
              
              <div>
                <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">
                  Welcome to <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-purple-400">BlackPayments</span>
                </h1>
                <p className="text-xl text-gray-400 max-w-2xl mx-auto">
                  Your secure USDT P2P wallet with split-custody protection
                </p>
              </div>

              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <button
                  onClick={createNewWallet}
                  disabled={isLoading}
                  className="px-8 py-4 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-2xl font-bold text-lg hover:scale-105 transition-all shadow-lg shadow-indigo-500/30 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                  aria-label="Create a new wallet"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="h-5 w-5 animate-spin" />
                      Creating...
                    </>
                  ) : (
                    <>
                      <Star className="h-5 w-5" /> Create Wallet
                    </>
                  )}
                </button>
                <button
                  onClick={importWallet}
                  className="px-8 py-4 bg-gray-800 text-white rounded-2xl font-bold text-lg hover:bg-gray-700 transition-colors border border-gray-700 flex items-center justify-center gap-2"
                >
                  <Key className="h-5 w-5" /> Import Wallet
                </button>
              </div>
            </div>

            {/* Features Grid with Icons */}
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
              {features.map((feature) => (
                <div key={feature.title} className="p-6 rounded-2xl bg-gray-900/50 border border-gray-800 hover:border-gray-700 transition-all hover:-translate-y-1">
                  <div className={`w-14 h-14 rounded-2xl bg-${feature.color}-500/20 flex items-center justify-center mb-4`}>
                    <feature.icon className={`h-7 w-7 text-${feature.color}-400`} />
                  </div>
                  <h3 className="text-lg font-bold text-white mb-2">{feature.title}</h3>
                  <p className="text-gray-400">{feature.desc}</p>
                </div>
              ))}
            </div>

            {/* Why Choose Us */}
            <div className="rounded-3xl bg-gradient-to-br from-indigo-900/50 via-purple-900/50 to-gray-900 p-8 md:p-12">
              <div className="text-center mb-8">
                <h2 className="text-3xl font-bold text-white mb-2">Why Choose BlackPayments?</h2>
                <p className="text-gray-400">The most secure way to trade USDT P2P</p>
              </div>
              
              <div className="grid md:grid-cols-3 gap-6">
                {[
                  { icon: Award, title: 'Best Rates', desc: 'Direct P2P trades with competitive prices', stat: '98%' },
                  { icon: Target, title: 'Fast Trading', desc: 'Instant escrow release after payment', stat: '< 5min' },
                  { icon: Shield, title: 'Secure Funds', desc: 'Split custody protects your assets', stat: '100%' },
                ].map((item) => (
                  <div key={item.title} className="text-center p-6">
                    <div className="w-16 h-16 rounded-2xl bg-white/10 flex items-center justify-center mx-auto mb-4">
                      <item.icon className="h-8 w-8 text-indigo-400" />
                    </div>
                    <p className="text-3xl font-bold text-white mb-1">{item.stat}</p>
                    <p className="text-lg text-gray-300 mb-1">{item.title}</p>
                    <p className="text-sm text-gray-500">{item.desc}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : (
          /* Dashboard with Wallet */
          <div className="space-y-6">
            {/* Main Wallet Card - Visual & Easy to Read */}
            <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-indigo-600 via-purple-600 to-indigo-800 p-6 md:p-8">
              {/* Background Decorations */}
              <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2" />
              <div className="absolute bottom-0 left-0 w-48 h-48 bg-white/10 rounded-full translate-y-1/2 -translate-x-1/2" />
              <div className="absolute top-1/2 left-1/2 w-32 h-32 bg-white/5 rounded-full -translate-x-1/2 -translate-y-1/2" />
              
              <div className="relative">
                {/* Wallet Header */}
                <div className="flex items-center justify-between mb-8">
                  <div className="flex items-center gap-4">
                    <div className="w-16 h-16 rounded-2xl bg-white/20 backdrop-blur flex items-center justify-center">
                      <Wallet className="h-8 w-8 text-white" />
                    </div>
                    <div>
                      <h2 className="text-2xl font-bold text-white">My Wallet</h2>
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 rounded-full text-xs bg-green-500/30 text-green-300 border border-green-500/30 flex items-center gap-1">
                          <Circle className="h-2 w-2 fill-current" /> Active
                        </span>
                      </div>
                    </div>
                  </div>
                  <button onClick={disconnectWallet} className="p-2 rounded-lg bg-white/10 hover:bg-white/20 text-white">
                    <LogOut className="h-5 w-5" />
                  </button>
                </div>

                {/* Balance Display - Large & Clear */}
                <div className="mb-8">
                  <p className="text-indigo-200 text-sm mb-1">Total Balance (USDT)</p>
                  <p className="text-4xl md:text-5xl lg:text-6xl font-bold text-white">${parseFloat(usdtBalance).toFixed(2)}</p>
                  <p className="text-indigo-200 mt-1">{parseFloat(balance).toFixed(6)} {chain.symbol}</p>
                </div>

                {/* Address - Easy to Copy */}
                <div className="p-4 rounded-xl bg-black/20 backdrop-blur mb-6">
                  <p className="text-xs text-indigo-300 mb-1">Wallet Address</p>
                  <div className="flex items-center justify-between">
                    <code className="text-sm text-white font-mono">{account.slice(0, 16)}...{account.slice(-12)}</code>
                    <button onClick={copyAddress} className="p-2 rounded-lg hover:bg-white/10">
                      {copied ? <Check className="h-4 w-4 text-green-400" /> : <Copy className="h-4 w-4 text-indigo-200" />}
                    </button>
                  </div>
                </div>

                {/* Quick Action Buttons - Big & Clear */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {quickActions.map((action) => (
                    <Link key={action.label} href={action.href}>
                      <div className="p-4 rounded-xl bg-white/10 hover:bg-white/20 backdrop-blur transition-colors text-center">
                        <action.icon className="h-6 w-6 mx-auto mb-2 text-white" />
                        <p className="text-sm font-medium text-white">{action.label}</p>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { label: 'Total Volume', value: '$12,450', icon: TrendingUp, color: 'green' },
                { label: 'Escrow Rate', value: '100%', icon: Shield, color: 'blue' },
                { label: 'Network Fee', value: '$0.001', icon: Zap, color: 'orange' },
                { label: 'P2P Trades', value: '24', icon: Activity, color: 'purple' },
              ].map((stat) => (
                <div key={stat.label} className="p-4 rounded-2xl bg-gray-900/50 border border-gray-800">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-gray-500 text-sm">{stat.label}</span>
                    <stat.icon className={`h-5 w-5 text-${stat.color}-400`} />
                  </div>
                  <p className="text-2xl font-bold text-white">{stat.value}</p>
                </div>
              ))}
            </div>

            {/* Networks */}
            <div className="rounded-2xl bg-gray-900/50 border border-gray-800 p-6">
              <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                <Globe className="h-5 w-5 text-indigo-400" /> Supported Networks
              </h3>
              <div className="grid md:grid-cols-3 gap-4">
                {networks.map((net) => (
                  <div key={net.id} className="p-4 rounded-xl bg-gray-800/50 border border-gray-700 flex items-center gap-3">
                    <span className="text-3xl">{net.emoji}</span>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <p className="font-semibold text-white">{net.name}</p>
                        {net.recommended && (
                          <span className="px-2 py-0.5 rounded-full text-xs bg-green-500/20 text-green-400">Best</span>
                        )}
                      </div>
                      <p className="text-xs text-gray-500">{net.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Wallet Connection Modal */}
      <WalletConnectModal
        isOpen={showWalletModal}
        onClose={() => setShowWalletModal(false)}
        onConnect={(account) => {
          setAccount(account);
          fetchBalances(account, selectedChain);
        }}
      />
    </div>
  );
}
