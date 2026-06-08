'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  TrendingUp, Shield, ArrowUpRight, ArrowDownLeft,
  Copy, Check, DollarSign, Lock, Flame, Zap, Activity,
  Users, CreditCard, Hexagon, Send, History, Settings,
  LogOut, QrCode, ExternalLink, Fingerprint, Layers,
  Target, Star, Award, CheckCircle2, Circle, ChevronRight,
  Wallet, Loader2, Key, Globe, Cloud, CloudOff, User,
  XCircle
} from 'lucide-react';
import { showToast } from '@/components/Toast';
import { useWalletStore } from '@/stores/walletStore';
import { useWalletAuth } from '@/hooks/useWalletAuth';
import { useWalletBalance } from '@/hooks/useWalletBalance';
import { WalletConnectModal } from '@/components/WalletConnectModal';
import { QRCode } from '@/components/QRCode';
import { CHAINS, ChainKey } from '@/config/chains';

// UI Constants - Features, actions, networks (unchanged)
const features = [
  { icon: Shield, title: 'Secure Escrow', desc: 'Your funds are protected with smart contracts', color: 'green' },
  { icon: Zap, title: 'Low Fees', desc: 'TRC-20 network for minimal transaction costs', color: 'yellow' },
  { icon: Users, title: 'P2P Trading', desc: 'Trade directly with verified users worldwide', color: 'blue' },
  { icon: Layers, title: 'Split Custody', desc: 'Hot & cold wallet security system', color: 'purple' },
];

const colorClassMap: any = {
  green: { bg: 'bg-green-500/20', text: 'text-green-400' },
  yellow: { bg: 'bg-yellow-500/20', text: 'text-yellow-400' },
  blue: { bg: 'bg-blue-500/20', text: 'text-blue-400' },
  purple: { bg: 'bg-purple-500/20', text: 'text-purple-400' },
  orange: { bg: 'bg-orange-500/20', text: 'text-orange-400' },
  indigo: { bg: 'bg-indigo-500/20', text: 'text-indigo-400' },
};

type QuickAction = {
  icon: any;
  label: string;
  href?: string;
  action?: () => void;
  color: string;
  desc: string;
};
const quickActions: QuickAction[] = [
  { icon: Send, label: 'Send USDT', href: '/send', color: 'blue', desc: 'Transfer to any address' },
  { icon: ArrowDownLeft, label: 'Receive', action: () => {}, color: 'green', desc: 'Get your deposit address' }, // Set via hook
  { icon: DollarSign, label: 'P2P Trade', href: '/p2p', color: 'orange', desc: 'Buy or sell USDT' },
  { icon: History, label: 'History', href: '/history', color: 'purple', desc: 'View all transactions' },
  { icon: User, label: 'Profile', href: '/profile', color: 'indigo', desc: 'Manage your account' },
  { icon: Settings, label: 'Settings', href: '/settings', color: 'gray', desc: 'App preferences' },
];

const networks = [
  { id: 'tron', name: 'TRON', symbol: 'TRX', emoji: '🔴', desc: 'Best for low fees', recommended: true },
  { id: 'bsc', name: 'BNB Chain', symbol: 'BNB', emoji: '🟡', desc: 'Fast & cheap' },
  { id: 'ethereum', name: 'Ethereum', symbol: 'ETH', emoji: '🔵', desc: 'Most popular' },
];

export default function Dashboard() {
  const router = useRouter();

  // Global state from store
  const {
    account,
    selectedChain,
    balance,
    usdtBalance,
    usdValue,
    priceChange,
    isLoading,
    isAuthenticated,
    isAuthLoading,
    showWalletModal,
    showPasswordModal,
    showImportModal,
    showEncryptModal,
    showReceiveQR,
    setShowWalletModal,
    setShowPasswordModal,
    setShowImportModal,
    setShowEncryptModal,
    setShowReceiveQR,
  } = useWalletStore();

  // Local UI state (truly component-specific)
  const [copied, setCopied] = useState(false);

  // Hooks for business logic
  const {
    // Auth state and actions
    pendingWalletAddress,
    setPendingWalletAddress,
    pendingWalletInstance,
    setPendingWalletInstance,
    walletPassword,
    setWalletPassword,
    importInput,
    setImportInput,
    importPassword,
    setImportPassword,
    encryptPassword,
    setEncryptPassword,
    createNewWallet,
    handleEncryptAndStore,
    openImportModal,
    handleImportSubmit,
    decryptWallet,
    disconnectWallet: authDisconnectWallet,
  } = useWalletAuth();

  const { fetchBalances } = useWalletBalance();

  // Simple UI handlers
  const connectWallet = () => setShowWalletModal(true);

  const copyAddress = () => {
    if (account) {
      navigator.clipboard.writeText(account);
      setCopied(true);
      showToast('success', 'Address copied to clipboard!');
      setTimeout(() => setCopied(false), 2000);
    }
  };

  // Set receive QR action
  quickActions[1].action = () => setShowReceiveQR(true);

  const chain = CHAINS[selectedChain];

  // Loading state
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
  if (!isAuthenticated && !isAuthLoading) {
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
              onKeyDown={(e) => e.key === 'Enter' && (async () => {
                try {
                  await decryptWallet(pendingWalletAddress!, walletPassword);
                } catch (err) { /* error handled in hook */ }
              })()}
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
                onClick={async () => {
                  try {
                    await decryptWallet(pendingWalletAddress!, walletPassword);
                  } catch (err) { /* error handled */ }
                }}
                disabled={!walletPassword}
                className="flex-1 px-4 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Decrypt Wallet
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Import Modal */}
      {showImportModal && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50">
          <div className="bg-gray-800 rounded-xl p-6 w-full max-w-md mx-4">
            <h2 className="text-xl font-bold text-white mb-4">Import Wallet</h2>
            <p className="text-gray-400 mb-2">Paste your private key (0x...) or 12/24-word seed phrase. Provide a password to encrypt the keystore for cloud storage.</p>
            <textarea
              value={importInput}
              onChange={(e) => setImportInput(e.target.value)}
              placeholder="Private key or seed phrase"
              className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 mb-3"
              rows={4}
            />
            <input
              type="password"
              value={importPassword}
              onChange={(e) => setImportPassword(e.target.value)}
              placeholder="Encryption password"
              className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 mb-4"
            />
            <div className="flex gap-3">
              <button
                onClick={() => { setShowImportModal(false); setImportInput(''); setImportPassword(''); }}
                className="flex-1 px-4 py-3 bg-gray-600 text-white rounded-lg hover:bg-gray-500 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleImportSubmit}
                disabled={!importInput || !importPassword}
                className="flex-1 px-4 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Import & Encrypt
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Encrypt Modal */}
      {showEncryptModal && pendingWalletInstance && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50">
          <div className="bg-gray-800 rounded-xl p-6 w-full max-w-md mx-4">
            <h2 className="text-xl font-bold text-white mb-4">Secure your new wallet</h2>
            <p className="text-gray-400 mb-2">Set a password to encrypt your keystore before saving it to the cloud.</p>
            <div className="mb-3">
              <p className="text-sm text-gray-300 mb-1">Address</p>
              <code className="text-sm text-white font-mono">{pendingWalletInstance.address}</code>
            </div>
            <input
              type="password"
              value={encryptPassword}
              onChange={(e) => setEncryptPassword(e.target.value)}
              placeholder="Encryption password"
              className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 mb-4"
            />
            <div className="flex gap-3">
              <button
                onClick={() => { setShowEncryptModal(false); setPendingWalletInstance(null); setEncryptPassword(''); }}
                className="flex-1 px-4 py-3 bg-gray-600 text-white rounded-lg hover:bg-gray-500 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleEncryptAndStore}
                disabled={!encryptPassword}
                className="flex-1 px-4 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Encrypt & Save
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main content */}
      <main className="max-w-6xl mx-auto px-4 py-8">
        {!account ? (
          // Welcome Screen
          <div className="space-y-12">
            <div className="flex justify-end">
              <Link href="/profile" className="p-2 rounded-lg bg-white/10 hover:bg-white/20 text-white" title="Profile">
                <User className="h-5 w-5" />
              </Link>
            </div>

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
                  onClick={openImportModal}
                  className="px-8 py-4 bg-gray-800 text-white rounded-2xl font-bold text-lg hover:bg-gray-700 transition-colors border border-gray-700 flex items-center justify-center gap-2"
                >
                  <Key className="h-5 w-5" /> Import Wallet
                </button>
              </div>
            </div>

            {/* Features Grid */}
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
              {features.map((feature) => (
                <div key={feature.title} className="p-6 rounded-2xl bg-gray-900/50 border border-gray-800 hover:border-gray-700 transition-all hover:-translate-y-1">
                  <div className={`${colorClassMap[feature.color].bg} w-14 h-14 rounded-2xl flex items-center justify-center mb-4`}>
                    <feature.icon className={`${colorClassMap[feature.color].text} h-7 w-7`} />
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
          // Dashboard
          <div className="space-y-6">
            <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-indigo-600 via-purple-600 to-indigo-800 p-6 md:p-8">
              <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2" />
              <div className="absolute bottom-0 left-0 w-48 h-48 bg-white/10 rounded-full translate-y-1/2 -translate-x-1/2" />
              <div className="absolute top-1/2 left-1/2 w-32 h-32 bg-white/5 rounded-full -translate-x-1/2 -translate-y-1/2" />

              <div className="relative">
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
                  <div className="flex items-center gap-2">
                    <Link href="/profile" className="p-2 rounded-lg bg-white/10 hover:bg-white/20 text-white" title="Profile">
                      <User className="h-5 w-5" />
                    </Link>
                    <button onClick={authDisconnectWallet} className="p-2 rounded-lg bg-white/10 hover:bg-white/20 text-white" title="Sign Out">
                      <LogOut className="h-5 w-5" />
                    </button>
                  </div>
                </div>

                <div className="mb-8">
                  <p className="text-indigo-200 text-sm mb-1">Total Balance</p>
                  <p className="text-4xl md:text-5xl lg:text-6xl font-bold text-white">{usdValue}</p>
                  <p className="text-indigo-200 mt-1">{parseFloat(usdtBalance).toFixed(2)} USDT</p>
                  {priceChange !== 0 && (
                    <p className={`text-sm mt-1 flex items-center gap-1 ${priceChange >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                      {priceChange >= 0 ? <TrendingUp className="h-4 w-4" /> : <TrendingUp className="h-4 w-4 rotate-180" />}
                      {priceChange >= 0 ? '+' : ''}{priceChange.toFixed(2)}% (24h)
                    </p>
                  )}
                </div>

                <div className="p-4 rounded-xl bg-black/20 backdrop-blur mb-6">
                  <p className="text-xs text-indigo-300 mb-1">Wallet Address</p>
                  <div className="flex items-center justify-between">
                    <code className="text-sm text-white font-mono">{account.slice(0, 16)}...{account.slice(-12)}</code>
                    <button onClick={copyAddress} className="p-2 rounded-lg hover:bg-white/10">
                      {copied ? <Check className="h-4 w-4 text-green-400" /> : <Copy className="h-4 w-4 text-indigo-200" />}
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {quickActions.map((action) => (
                    action.href ? (
                      <Link key={action.label} href={action.href}>
                        <div className="p-4 rounded-xl bg-white/10 hover:bg-white/20 backdrop-blur transition-colors text-center cursor-pointer">
                          <action.icon className="h-6 w-6 mx-auto mb-2 text-white" />
                          <p className="text-sm font-medium text-white">{action.label}</p>
                        </div>
                      </Link>
                    ) : (
                      <button key={action.label} onClick={action.action} className="w-full">
                        <div className="p-4 rounded-xl bg-white/10 hover:bg-white/20 backdrop-blur transition-colors text-center">
                          <action.icon className="h-6 w-6 mx-auto mb-2 text-white" />
                          <p className="text-sm font-medium text-white">{action.label}</p>
                        </div>
                      </button>
                    )
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
                    <stat.icon className={`${colorClassMap[stat.color].text} h-5 w-5`} />
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

      {/* Modals */}
      <WalletConnectModal
        isOpen={showWalletModal}
        onClose={() => setShowWalletModal(false)}
        onConnect={(account) => {
          useWalletStore.getState().setAccount(account);
          fetchBalances(account, selectedChain);
        }}
      />

      {showReceiveQR && account && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="relative overflow-hidden rounded-2xl bg-gray-800 p-6 max-w-md w-full border border-gray-700">
            <button
              onClick={() => setShowReceiveQR(false)}
              className="absolute top-4 right-4 p-1 hover:bg-gray-700 rounded-lg"
            >
              <XCircle className="h-6 w-6 text-gray-400" />
            </button>

            <h3 className="text-xl font-bold text-white mb-2 text-center">
              Receive USDT
            </h3>
            <p className="text-sm text-gray-400 text-center mb-4">
              Send only USDT to this address
            </p>

            <QRCode address={account} size={220} />

            <div className="mt-4 p-3 rounded-xl bg-yellow-500/10 border border-yellow-500/30">
              <p className="text-xs text-yellow-400 text-center">
                Warning: Send only USDT. Other tokens sent may be lost.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
