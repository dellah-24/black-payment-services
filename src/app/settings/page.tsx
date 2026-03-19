'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
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
  CheckCircle
} from 'lucide-react';

export default function SettingsPage() {
  const [account, setAccount] = useState<string | null>(null);
  const [notifications, setNotifications] = useState(true);
  const [twoFactor, setTwoFactor] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    const savedAccount = localStorage.getItem('account');
    if (savedAccount) {
      setAccount(savedAccount);
    }
  }, []);

  const saveSettings = () => {
    localStorage.setItem('notifications', notifications.toString());
    localStorage.setItem('twoFactor', twoFactor.toString());
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const clearData = () => {
    if (confirm('Are you sure you want to clear all local data? This cannot be undone.')) {
      localStorage.clear();
      window.location.reload();
    }
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
                notifications ? 'bg-primary-600' : 'bg-gray-600'
              }`}
            >
              <span className={`absolute top-1 left-1 w-6 h-6 bg-white rounded-full transition-transform ${
                notifications ? 'translate-x-6' : 'translate-x-0'
              }`} />
            </button>
          </div>
        </div>

        {/* Security */}
        <div className="rounded-2xl bg-gray-800/50 backdrop-blur-sm border border-gray-700/50 p-6 mb-6">
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2 text-white">
            <Shield className="h-5 w-5" />
            Security
          </h2>
          
          <div className="flex items-center justify-between py-3 border-b border-gray-700">
            <div>
              <p className="font-medium text-white">
                Two-Factor Authentication
              </p>
              <p className="text-sm text-gray-400">
                Add an extra layer of security
              </p>
            </div>
            <button
              onClick={() => setTwoFactor(!twoFactor)}
              className={`relative w-14 h-8 rounded-full transition-colors ${
                twoFactor ? 'bg-primary-600' : 'bg-gray-600'
              }`}
            >
              <span className={`absolute top-1 left-1 w-6 h-6 bg-white rounded-full transition-transform ${
                twoFactor ? 'translate-x-6' : 'translate-x-0'
              }`} />
            </button>
          </div>

          <div className="py-3 border-b border-gray-700">
            <p className="font-medium text-white">
              Connected Wallet
            </p>
            <p className="text-sm font-mono text-gray-400">
              {account.slice(0, 10)}...{account.slice(-10)}
            </p>
          </div>

          <div className="py-3">
            <button className={`flex items-center gap-2 text-primary-600 hover:text-primary-700`}>
              <Key className="h-4 w-4" />
              View Recovery Phrase
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
          className="w-full py-4 bg-primary-600 hover:bg-primary-700 text-white rounded-xl font-bold text-lg transition-colors"
        >
          {saved ? 'Settings Saved!' : 'Save Settings'}
        </button>

        {/* Version Info */}
        <p className="text-center text-sm mt-6 text-gray-500">
          BlackPayments v1.0.0 • Built with Next.js
        </p>
      </div>
    </div>
  );
}
