'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { 
  Settings, 
  ArrowLeft, 
  ArrowRight,
  Bell, 
  Shield, 
  Globe, 
  Key, 
  Trash2,
  ExternalLink,
  Wallet,
  CheckCircle,
  Lock,
  Clock,
  Fingerprint,
  Eye,
  EyeOff
} from 'lucide-react';
import { getAutoLockTimeout, setAutoLockTimeout } from '@/lib/walletUtils';
import { walletStorage } from '@/lib/secureWalletStorage';
import { supabase } from '@/lib/supabaseClient';
import { profileApi } from '@/lib/profileApi';
import { getEnv, isProduction } from '@/lib/env';

export default function SettingsPage() {
  const router = useRouter();
  const [account, setAccount] = useState<string | null>(null);
  const [walletAddress, setWalletAddress] = useState<string>('');
  const [notifications, setNotifications] = useState(true);
  const [twoFactor, setTwoFactor] = useState(false);
  const [saved, setSaved] = useState(false);
  const [autoLockTimeout, setAutoLockTimeoutState] = useState(0);
  const [biometricEnabled, setBiometricEnabled] = useState(false);
  const [showSeedPhrase, setShowSeedPhrase] = useState(false);
  const [seedPhrase, setSeedPhrase] = useState<string>('');

  const productionMode = isProduction();
  const defaultChain = getEnv('NEXT_PUBLIC_DEFAULT_CHAIN', 'tron');

  useEffect(() => {
    if (typeof window === 'undefined') return;
    
    // Check authentication - redirect to auth if not logged in
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.push('/auth');
        return;
      }
      
      // Check for profile with wallet
      try {
        const profile = await profileApi.getByUserId(session.user.id);
        if (!profile || !profile.wallet_address) {
          router.push('/onboarding');
          return;
        }
        
        const savedAccount = profile.wallet_address.toLowerCase();
        setAccount(savedAccount);
        loadWalletData(savedAccount);
      } catch (e) {
        router.push('/');
      }
    };
    
    checkAuth();
    
    // Load settings
    const savedNotifications = localStorage.getItem('notifications');
    if (savedNotifications !== null) {
      setNotifications(savedNotifications === 'true');
    }
    
    const savedTwoFactor = localStorage.getItem('twoFactor');
    if (savedTwoFactor !== null) {
      setTwoFactor(savedTwoFactor === 'true');
    }
    
    // Load auto-lock timeout
    const timeout = getAutoLockTimeout();
    setAutoLockTimeoutState(timeout);
    
    // Load biometric preference
    const biometric = localStorage.getItem('biometricEnabled');
    if (biometric !== null) {
      setBiometricEnabled(biometric === 'true');
    }
  }, []);

  const loadWalletData = async (accountAddress: string) => {
    try {
      // Try to load wallet data, but don't fail if encryption key is missing
      const walletData = await walletStorage.retrieveWallet(accountAddress);
      if (walletData) {
        setWalletAddress(accountAddress);
      } else {
        // Wallet data not available - that's okay
        setWalletAddress(accountAddress);
      }
    } catch (err) {
      // Encryption key not found - this is expected on fresh page load
      setWalletAddress(accountAddress);
    }
  };

  const saveSettings = () => {
    localStorage.setItem('notifications', notifications.toString());
    localStorage.setItem('twoFactor', twoFactor.toString());
    localStorage.setItem('biometricEnabled', biometricEnabled.toString());
    setAutoLockTimeout(autoLockTimeout);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const handleAutoLockChange = (minutes: number) => {
    setAutoLockTimeoutState(minutes);
  };

  const handleBiometricToggle = async () => {
    if (!biometricEnabled) {
      // Try to enable biometric
      if (typeof window !== 'undefined' && window.isSecureContext) {
        try {
          const available = await window.navigator.credentials?.get({ mediation: 'optional' });
          setBiometricEnabled(true);
          localStorage.setItem('biometricEnabled', 'true');
        } catch (err) {
          alert('Biometric authentication not available on this device');
        }
      }
    } else {
      setBiometricEnabled(false);
      localStorage.setItem('biometricEnabled', 'false');
    }
  };

  const viewSeedPhrase = async () => {
    if (!account) return;
    
    try {
      const walletData = await walletStorage.retrieveWallet(account);
      if (walletData && walletData.mnemonic) {
        setSeedPhrase(walletData.mnemonic);
        setShowSeedPhrase(true);
      } else {
        alert('No seed phrase available for this wallet');
      }
    } catch (err) {
      alert('Failed to retrieve seed phrase');
    }
  };

  const clearData = () => {
    if (confirm('Are you sure you want to clear all local data? This cannot be undone.')) {
      localStorage.clear();
      window.location.reload();
    }
  };

  const lockWallet = () => {
    localStorage.removeItem('account');
    localStorage.removeItem('currentAccount');
    router.push('/');
  };

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

  return (
    <div className="min-h-screen py-8">
      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="flex items-center mb-8">
          <Link href="/" className="p-2 rounded-lg bg-gray-800/50 hover:bg-gray-700/50 transition-colors mr-4">
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <h1 className="text-2xl font-bold text-white">
            Settings
          </h1>
        </div>

        {/* Quick Actions */}
        <div className="flex gap-3 mb-6">
          <button
            onClick={lockWallet}
            className="flex-1 flex items-center justify-center gap-2 py-3 bg-gray-800/50 hover:bg-gray-700/50 rounded-xl border border-gray-700/50 transition-colors"
          >
            <Lock className="h-5 w-5 text-red-400" />
            <span className="text-gray-300">Lock Wallet</span>
          </button>
        </div>

        {/* Security Settings */}
        <div className="rounded-2xl bg-gray-800/50 backdrop-blur-sm border border-gray-700/50 p-6 mb-6">
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2 text-white">
            <Shield className="h-5 w-5" />
            Security
          </h2>
          
          {/* Auto-Lock Timeout */}
          <div className="py-3 border-b border-gray-700">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Clock className="h-5 w-5 text-gray-400" />
                <div>
                  <p className="font-medium text-white">
                    Auto-Lock
                  </p>
                  <p className="text-sm text-gray-400">
                    Automatically lock wallet after inactivity
                  </p>
                </div>
              </div>
            </div>
            <div className="grid grid-cols-4 gap-2">
              {[0, 1, 5, 15].map((minutes) => (
                <button
                  key={minutes}
                  onClick={() => handleAutoLockChange(minutes)}
                  className={`p-2 rounded-lg text-sm transition-colors ${
                    autoLockTimeout === minutes
                      ? 'bg-indigo-600 text-white'
                      : 'bg-gray-700 text-gray-400 hover:bg-gray-600'
                  }`}
                >
                  {minutes === 0 ? 'Off' : `${minutes}m`}
                </button>
              ))}
            </div>
          </div>

          {/* Biometric Authentication */}
          <div className="py-3 border-b border-gray-700">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Fingerprint className="h-5 w-5 text-gray-400" />
                <div>
                  <p className="font-medium text-white">
                    Biometric Authentication
                  </p>
                  <p className="text-sm text-gray-400">
                    Use fingerprint or face to unlock
                  </p>
                </div>
              </div>
              <button
                onClick={handleBiometricToggle}
                className={`relative w-14 h-8 rounded-full transition-colors ${
                  biometricEnabled ? 'bg-indigo-600' : 'bg-gray-600'
                }`}
              >
                <span className={`absolute top-1 left-1 w-6 h-6 bg-white rounded-full transition-transform ${
                  biometricEnabled ? 'translate-x-6' : 'translate-x-0'
                }`} />
              </button>
            </div>
          </div>

          {/* Connected Wallet */}
          <div className="py-3 border-b border-gray-700">
            <p className="font-medium text-white mb-1">
              Connected Wallet
            </p>
            <p className="text-sm font-mono text-gray-400 break-all">
              {walletAddress || account.slice(0, 20)}...{account.slice(-10)}
            </p>
          </div>

          {/* View Recovery Phrase */}
          <div className="py-3">
            <button 
              onClick={viewSeedPhrase}
              className="flex items-center gap-2 text-indigo-400 hover:text-indigo-300 transition-colors"
            >
              <Key className="h-4 w-4" />
              View Recovery Phrase
            </button>
          </div>
        </div>

        {/* Notifications */}
        <div className="rounded-2xl bg-gray-800/50 backdrop-blur-sm border border-gray-700/50 p-6 mb-6">
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2 text-white">
            <Bell className="h-5 w-5" />
            Notifications
          </h2>
          
          <div className="flex items-center justify-between py-3 border-b border-gray-700">
            <div>
              <p className="font-medium text-white">
                Push Notifications
              </p>
              <p className="text-sm text-gray-400">
                Receive notifications for transactions
              </p>
            </div>
            <button
              onClick={() => setNotifications(!notifications)}
              className={`relative w-14 h-8 rounded-full transition-colors ${
                notifications ? 'bg-indigo-600' : 'bg-gray-600'
              }`}
            >
              <span className={`absolute top-1 left-1 w-6 h-6 bg-white rounded-full transition-transform ${
                notifications ? 'translate-x-6' : 'translate-x-0'
              }`} />
            </button>
          </div>
        </div>

        {/* Network */}
        <div className="rounded-2xl bg-gray-800/50 backdrop-blur-sm border border-gray-700/50 p-6 mb-6">
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2 text-white">
            <Globe className="h-5 w-5" />
            Network
          </h2>
          
          <div className="space-y-3">
            <div className="p-3 rounded-lg bg-gray-700">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-white">
                    TRON (TRC-20)
                  </p>
                  <p className="text-sm text-gray-400">
                    Recommended - Lowest fees
                  </p>
                </div>
                <CheckCircle className="h-5 w-5 text-green-500" />
              </div>
            </div>
            
            <div className="p-3 rounded-lg bg-gray-700">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-white">
                    BNB Chain (BEP-20)
                  </p>
                  <p className="text-sm text-gray-400">
                    Medium fees
                  </p>
                </div>
              </div>
            </div>
            
            <div className="p-3 rounded-lg bg-gray-700">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-white">
                    Ethereum (ERC-20)
                  </p>
                  <p className="text-sm text-gray-400">
                    Higher fees
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Production Network */}
        <div className="rounded-2xl bg-gray-800/50 backdrop-blur-sm border border-gray-700/50 p-6 mb-6">
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2 text-white">
            <Globe className="h-5 w-5" />
            Production Network
          </h2>

          <div className="space-y-4">
            <div className={`p-4 rounded-xl border ${
              productionMode ? 'border-green-500/30 bg-green-500/10' : 'border-yellow-500/30 bg-yellow-500/10'
            }`}>
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="font-medium text-white">
                    {productionMode ? 'Production mode enabled' : 'Development mode detected'}
                  </p>
                  <p className="text-sm text-gray-400">
                    {productionMode
                      ? 'Mainnet RPC URLs, HTTPS callbacks, HSM custody, and production locks are enforced.'
                      : 'Localhost and testnet helpers are available only while developing locally.'}
                  </p>
                </div>
                {productionMode ? (
                  <CheckCircle className="h-5 w-5 text-green-500 shrink-0 mt-1" />
                ) : (
                  <ExternalLink className="h-5 w-5 text-yellow-500 shrink-0 mt-1" />
                )}
              </div>
            </div>

            <div className="p-3 rounded-lg bg-gray-700">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-white">
                    Default Chain
                  </p>
                  <p className="text-sm text-gray-400">
                    NEXT_PUBLIC_DEFAULT_CHAIN = {defaultChain}
                  </p>
                </div>
                <CheckCircle className="h-5 w-5 text-green-500" />
              </div>
            </div>
          </div>
        </div>

        {/* Danger Zone */}
        <div className={`rounded-2xl p-6 mb-6 border border-red-500/30 bg-red-900/10`}>
          <h2 className={`text-lg font-semibold mb-4 flex items-center gap-2 text-red-500`}>
            <Trash2 className="h-5 w-5" />
            Danger Zone
          </h2>
          
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-white">
                Clear All Data
              </p>
              <p className="text-sm text-gray-400">
                Remove all local storage data
              </p>
            </div>
            <button
              onClick={clearData}
              className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium"
            >
              Clear Data
            </button>
          </div>
        </div>

        {/* Save Button */}
        <button
          onClick={saveSettings}
          className="w-full py-4 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white rounded-xl font-bold text-lg transition-colors"
        >
          {saved ? 'Settings Saved!' : 'Save Settings'}
        </button>

        {/* Version Info */}
        <p className="text-center text-sm mt-6 text-gray-500">
          BlackPayments v1.0.0 • Built with Next.js
        </p>

        {/* Seed Phrase Modal */}
        {showSeedPhrase && (
          <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="relative overflow-hidden rounded-2xl bg-gray-800 p-6 max-w-md w-full border border-gray-700">
              <h3 className="text-xl font-bold text-white mb-4">
                Recovery Phrase
              </h3>
              
              <div className="p-4 rounded-xl bg-yellow-500/10 border border-yellow-500/30 mb-4">
                <p className="text-sm text-yellow-400">
                  ⚠️ Never share your recovery phrase with anyone. Anyone with this phrase can access your wallet.
                </p>
              </div>
              
              <div className="p-4 rounded-xl bg-gray-900/50 border border-gray-700">
                <p className="font-mono text-sm text-white break-words">
                  {seedPhrase}
                </p>
              </div>
              
              <div className="flex gap-3 mt-6">
                <button
                  onClick={() => { setShowSeedPhrase(false); setSeedPhrase(''); }}
                  className="flex-1 py-3 bg-gray-700 text-white rounded-xl font-medium hover:bg-gray-600"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
