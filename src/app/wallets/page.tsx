'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Lock,
  ArrowLeft,
  ArrowRight,
  Wallet,
  Flame,
  Shield,
  Copy,
  Check,
  ExternalLink,
  RefreshCw,
  AlertTriangle,
  Zap,
  CreditCard,
  Plus,
  Eye,
  EyeOff,
  Trash2,
  Sparkles
} from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';
import { profileApi } from '@/lib/profileApi';
import { logger } from '@/lib/logger';

interface WalletData {
  address: string;
  balance: string;
  usdtBalance: string;
  type: 'hot' | 'cold';
  lastActivity: string;
}

interface VirtualCard {
  id: string;
  name: string;
  network: 'Visa' | 'Mastercard';
  last4: string;
  expiry: string;
  status: 'active' | 'frozen' | 'pending';
  limit: string;
  currency: 'USD' | 'ZWL';
  createdAt: string;
}

const cardStorageKey = 'blackpayments_virtual_cards';

const defaultCardForm = {
  name: '',
  network: 'Visa' as VirtualCard['network'],
  limit: '500',
  currency: 'USD' as VirtualCard['currency'],
};

export default function WalletsPage() {
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');
  const [account, setAccount] = useState<string | null>(null);
  const [hotWallet, setHotWallet] = useState<WalletData>({
    address: '',
    balance: '0',
    usdtBalance: '0',
    type: 'hot',
    lastActivity: new Date().toISOString(),
  });
  const [coldWallet, setColdWallet] = useState<WalletData>({
    address: '',
    balance: '0',
    usdtBalance: '0',
    type: 'cold',
    lastActivity: new Date().toISOString(),
  });
  const [copied, setCopied] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [virtualCards, setVirtualCards] = useState<VirtualCard[]>([]);
  const [cardForm, setCardForm] = useState(defaultCardForm);
  const [visibleCardIds, setVisibleCardIds] = useState<Record<string, boolean>>({});
  const router = useRouter();

  useEffect(() => {
    if (typeof window === 'undefined') return;
    
    const savedTheme = localStorage.getItem('theme') as 'dark' | 'light' | null;
    if (savedTheme) setTheme(savedTheme);
    
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
        
        setAccount(profile.wallet_address!.toLowerCase());
        // Initialize hot wallet with main account
        setHotWallet(prev => ({
          ...prev,
          address: profile.wallet_address!.toLowerCase(),
          usdtBalance: '500.00',
        }));
      } catch (e) {
        // Keep the user on the Wallets page so the navigation URL remains stable.
      }
    };
    
    checkAuth();

    // Generate or load cold wallet
    const savedColdWallet = localStorage.getItem('coldWallet');
    if (savedColdWallet) {
      setColdWallet(JSON.parse(savedColdWallet));
    } else {
      // Generate a new cold wallet address (demo)
      const newColdAddress = '0x' + Array(40).fill(0).map(() =>
        Math.floor(Math.random() * 16).toString(16)
      ).join('');
      const newCold: WalletData = {
        address: newColdAddress,
        balance: '0',
        usdtBalance: '10000.00',
        type: 'cold',
        lastActivity: new Date().toISOString(),
      };
      setColdWallet(newCold);
      localStorage.setItem('coldWallet', JSON.stringify(newCold));
    }

   const savedCards = localStorage.getItem(cardStorageKey);
   if (savedCards) {
     try {
       setVirtualCards(JSON.parse(savedCards) as VirtualCard[]);
     } catch (error) {
       logger.warn('Unable to load saved virtual cards', error);
     }
   }
 }, []);

  const refreshBalances = async () => {
    setIsRefreshing(true);
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1500));
    setIsRefreshing(false);
  };

  const copyAddress = (address: string) => {
    navigator.clipboard.writeText(address);
    setCopied(address);
    setTimeout(() => setCopied(null), 2000);
  };

  const persistVirtualCards = (cards: VirtualCard[]) => {
    localStorage.setItem(cardStorageKey, JSON.stringify(cards));
  };

  const createVirtualCard = () => {
    if (!cardForm.name.trim()) {
      alert('Enter a card nickname first.');
      return;
    }

    const last4 = Math.floor(1000 + Math.random() * 9000).toString();
    const expiryMonth = String(new Date().getMonth() + 36).padStart(2, '0').slice(-2);
    const expiryYear = String(new Date().getFullYear() + 3).slice(-2);
    const newCard: VirtualCard = {
      id: `card_${Date.now()}_${last4}`,
      name: cardForm.name.trim(),
      network: cardForm.network,
      last4,
      expiry: `${expiryMonth}/${expiryYear}`,
      status: 'pending',
      limit: cardForm.limit || '0',
      currency: cardForm.currency,
      createdAt: new Date().toISOString(),
    };

    const updated = [newCard, ...virtualCards];
    setVirtualCards(updated);
    persistVirtualCards(updated);
    setCardForm(defaultCardForm);
  };

  const deleteVirtualCard = (cardId: string) => {
    const updated = virtualCards.filter((card) => card.id !== cardId);
    setVirtualCards(updated);
    persistVirtualCards(updated);
    setVisibleCardIds((visible) => {
      const next = { ...visible };
      delete next[cardId];
      return next;
    });
  };

  const toggleCardVisibility = (cardId: string) => {
    setVisibleCardIds((visible) => ({
      ...visible,
      [cardId]: !visible[cardId],
    }));
  };

  const copyCardToken = (card: VirtualCard) => {
    const token = `bp_card_${card.id}_${card.last4}`;
    navigator.clipboard.writeText(token);
    setCopied(token);
    setTimeout(() => setCopied(null), 2000);
  };

  const formatMaskedNumber = (last4: string) => `•••• •••• •••• ${last4}`;

  const transferToCold = () => {
    alert('This would initiate a transfer from Hot Wallet to Cold Wallet. In production, this would require multi-signature approval.');
  };

  const transferToHot = () => {
    alert('This would initiate a transfer from Cold Wallet to Hot Wallet. In production, this would require multi-signature approval.');
  };

  if (!account) {
    return (
      <div className="min-h-screen py-8">
        <div className="max-w-4xl mx-auto px-4">
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
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center">
            <Link href="/" className="p-2 rounded-lg bg-gray-800/50 hover:bg-gray-700/50 transition-colors mr-4">
              <ArrowLeft className="h-5 w-5" />
            </Link>
            <h1 className="text-2xl font-bold text-white">
              Wallet Management
            </h1>
          </div>
          <button
            onClick={refreshBalances}
            disabled={isRefreshing}
            className="p-2 rounded-lg bg-gray-800/50 hover:bg-gray-700/50 transition-colors"
          >
            <RefreshCw className={`h-5 w-5 ${isRefreshing ? 'animate-spin' : ''}`} />
          </button>
        </div>

        {/* G.O.L.D. Rule Explanation */}
        <div className="rounded-xl p-4 mb-8 bg-primary-900/20 border border-primary-700">
          <h3 className="font-semibold mb-2 text-primary-400">
            G.O.L.D. Rule for Split-Custody
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <span className="font-bold text-primary-400">G</span> - Generate yield (Cold)
            </div>
            <div>
              <span className="font-bold text-primary-400">O</span> - Operate daily (Hot)
            </div>
            <div>
              <span className="font-bold text-primary-400">L</span> - Limit hot wallet funds
            </div>
            <div>
              <span className="font-bold text-primary-400">D</span> - Double-check addresses
            </div>
          </div>
        </div>

        {/* Hot Wallet */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-4">
            <div className="bg-orange-500/20 p-2 rounded-lg">
              <Flame className="h-6 w-6 text-orange-500" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">
                Hot Wallet
              </h2>
              <p className="text-sm text-gray-400">
                For daily operations & active trading
              </p>
            </div>
            <span className="ml-auto px-3 py-1 rounded-full text-xs font-medium bg-orange-900/30 text-orange-400">
              Online
            </span>
          </div>
          
          <div className="rounded-2xl bg-gray-800/50 backdrop-blur-sm border border-gray-700/50 p-6">
            <div className="p-4 rounded-xl bg-gray-900/50 mb-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-gray-400 mb-1">
                    Wallet Address
                  </p>
                  <code className="font-mono text-sm text-white">
                    {hotWallet.address.slice(0, 14)}...{hotWallet.address.slice(-12)}
                  </code>
                </div>
                <button
                  onClick={() => copyAddress(hotWallet.address)}
                  className="p-2 rounded-lg hover:bg-gray-700"
                >
                  {copied === hotWallet.address ? 
                    <Check className="h-5 w-5 text-green-500" /> : 
                    <Copy className="h-5 w-5" />
                  }
                </button>
              </div>
            </div>
            
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              <div className="p-4 rounded-xl bg-gray-900/50">
                <p className="text-xs text-gray-400 mb-1">
                  USDT Balance
                </p>
                <p className="text-xl font-bold text-primary-600">
                  ${parseFloat(hotWallet.usdtBalance).toFixed(2)}
                </p>
              </div>
              <div className="p-4 rounded-xl bg-gray-900/50">
                <p className="text-xs text-gray-400 mb-1">
                  Allocation
                </p>
                <p className="text-xl font-bold text-white">
                  5-20%
                </p>
              </div>
              <div className="p-4 rounded-xl bg-gray-900/50">
                <p className="text-xs text-gray-400 mb-1">
                  Network
                </p>
                <p className="text-xl font-bold text-white">
                  TRC-20
                </p>
              </div>
              <div className="p-4 rounded-xl bg-gray-900/50">
                <p className="text-xs text-gray-400 mb-1">
                  Last Activity
                </p>
                <p className="text-sm font-medium text-white">
                  Just now
                </p>
              </div>
            </div>
            
            <div className="flex gap-3">
              <button
                onClick={transferToCold}
                className="flex-1 py-3 bg-orange-600 hover:bg-orange-700 text-white rounded-xl font-medium flex items-center justify-center gap-2"
              >
                <Shield className="h-4 w-4" />
                Transfer to Cold
              </button>
            </div>
          </div>
        </div>

        {/* Cold Wallet */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-4">
            <div className="bg-blue-500/20 p-2 rounded-lg">
              <Shield className="h-6 w-6 text-blue-500" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">
                Cold Wallet
              </h2>
              <p className="text-sm text-gray-400">
                Long-term storage & reserves
              </p>
            </div>
            <span className="ml-auto px-3 py-1 rounded-full text-xs font-medium bg-blue-900/30 text-blue-400">
              Offline
            </span>
          </div>
          
          <div className="rounded-2xl bg-gray-800/50 backdrop-blur-sm border border-gray-700/50 p-6">
            <div className="p-4 rounded-xl bg-gray-900/50 mb-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-gray-400 mb-1">
                    Wallet Address
                  </p>
                  <code className="font-mono text-sm text-white">
                    {coldWallet.address.slice(0, 14)}...{coldWallet.address.slice(-12)}
                  </code>
                </div>
                <button
                  onClick={() => copyAddress(coldWallet.address)}
                  className="p-2 rounded-lg hover:bg-gray-700"
                >
                  {copied === coldWallet.address ? 
                    <Check className="h-5 w-5 text-green-500" /> : 
                    <Copy className="h-5 w-5" />
                  }
                </button>
              </div>
            </div>
            
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              <div className="p-4 rounded-xl bg-gray-900/50">
                <p className="text-xs text-gray-400 mb-1">
                  USDT Balance
                </p>
                <p className="text-xl font-bold text-blue-600">
                  ${parseFloat(coldWallet.usdtBalance).toFixed(2)}
                </p>
              </div>
              <div className="p-4 rounded-xl bg-gray-900/50">
                <p className="text-xs text-gray-400 mb-1">
                  Allocation
                </p>
                <p className="text-xl font-bold text-white">
                  80-95%
                </p>
              </div>
              <div className="p-4 rounded-xl bg-gray-900/50">
                <p className="text-xs text-gray-400 mb-1">
                  Security
                </p>
                <p className="text-xl font-bold text-white">
                  Multi-sig
                </p>
              </div>
              <div className="p-4 rounded-xl bg-gray-900/50">
                <p className="text-xs text-gray-400 mb-1">
                  Storage
                </p>
                <p className="text-sm font-medium text-white">
                  Hardware Wallet
                </p>
              </div>
            </div>
            
            <div className="flex gap-3">
              <button
                onClick={transferToHot}
                className="flex-1 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-medium flex items-center justify-center gap-2"
              >
                <Zap className="h-4 w-4" />
                Transfer to Hot
              </button>
            </div>
          </div>
        </div>

        {/* Virtual Cards */}
        <section id="virtual-cards" className="mb-8 scroll-mt-24">
          <div className="flex items-start justify-between gap-4 mb-4">
            <div className="flex items-center gap-3">
              <div className="bg-emerald-500/20 p-2 rounded-lg">
                <CreditCard className="h-6 w-6 text-emerald-500" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-white">
                  Virtual Cards
                </h2>
                <p className="text-sm text-gray-400">
                  Issue merchant, travel, and team cards with spend limits and instant freeze controls.
                </p>
              </div>
            </div>
            <span className="px-3 py-1 rounded-full text-xs font-medium bg-emerald-900/30 text-emerald-400">
              Demo issuer
            </span>
          </div>

          <div className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
            <div className="rounded-2xl bg-gray-800/50 backdrop-blur-sm border border-gray-700/50 p-6">
              <div className="flex items-center gap-2 mb-4">
                <Plus className="h-5 w-5 text-emerald-400" />
                <h3 className="font-semibold text-white">Add virtual card</h3>
              </div>

              <div className="space-y-4">
                <label className="block">
                  <span className="text-xs text-gray-400">Card nickname</span>
                  <input
                    value={cardForm.name}
                    onChange={(event) => setCardForm((form) => ({ ...form, name: event.target.value }))}
                    className="mt-1 w-full rounded-xl border border-gray-700 bg-gray-900/60 px-4 py-3 text-white outline-none focus:border-emerald-400"
                    placeholder="e.g. Facebook Ads"
                  />
                </label>

                <div className="grid grid-cols-2 gap-3">
                  <label className="block">
                    <span className="text-xs text-gray-400">Network</span>
                    <select
                      value={cardForm.network}
                      onChange={(event) => setCardForm((form) => ({ ...form, network: event.target.value as VirtualCard['network'] }))}
                      className="mt-1 w-full rounded-xl border border-gray-700 bg-gray-900/60 px-4 py-3 text-white outline-none focus:border-emerald-400"
                    >
                      <option value="Visa">Visa</option>
                      <option value="Mastercard">Mastercard</option>
                    </select>
                  </label>

                  <label className="block">
                    <span className="text-xs text-gray-400">Currency</span>
                    <select
                      value={cardForm.currency}
                      onChange={(event) => setCardForm((form) => ({ ...form, currency: event.target.value as VirtualCard['currency'] }))}
                      className="mt-1 w-full rounded-xl border border-gray-700 bg-gray-900/60 px-4 py-3 text-white outline-none focus:border-emerald-400"
                    >
                      <option value="USD">USD</option>
                      <option value="ZWL">ZWL</option>
                    </select>
                  </label>
                </div>

                <label className="block">
                  <span className="text-xs text-gray-400">Monthly limit</span>
                  <input
                    value={cardForm.limit}
                    onChange={(event) => setCardForm((form) => ({ ...form, limit: event.target.value.replace(/[^0-9.]/g, '') }))}
                    className="mt-1 w-full rounded-xl border border-gray-700 bg-gray-900/60 px-4 py-3 text-white outline-none focus:border-emerald-400"
                    placeholder="500"
                    inputMode="decimal"
                  />
                </label>

                <button
                  onClick={createVirtualCard}
                  className="w-full py-3 bg-gradient-to-r from-emerald-500 to-indigo-500 hover:from-emerald-400 hover:to-indigo-400 text-white rounded-xl font-bold flex items-center justify-center gap-2"
                >
                  <Plus className="h-4 w-4" />
                  Create card
                </button>

                <p className="text-xs text-gray-400 leading-5">
                  This demo stores only masked card metadata locally. In production, card creation, PAN/CVV tokenization, KYC/KYB checks, 3DS, and spend controls should be handled by a PCI-DSS compliant card issuer.
                </p>
              </div>
            </div>

            <div className="rounded-2xl bg-gray-800/50 backdrop-blur-sm border border-gray-700/50 p-6">
              <div className="flex items-center justify-between gap-4 mb-4">
                <div>
                  <h3 className="font-semibold text-white">Your cards</h3>
                  <p className="text-sm text-gray-400">{virtualCards.length} card{virtualCards.length === 1 ? '' : 's'} saved on this device</p>
                </div>
                <Sparkles className="h-5 w-5 text-emerald-400" />
              </div>

              {virtualCards.length === 0 ? (
                <div className="rounded-xl border border-dashed border-gray-700 p-8 text-center">
                  <CreditCard className="h-10 w-10 text-gray-500 mx-auto mb-3" />
                  <p className="text-white font-semibold mb-1">No virtual cards yet</p>
                  <p className="text-sm text-gray-400">Create a card to manage subscriptions, ad spend, or team expenses.</p>
                </div>
              ) : (
                <div className="grid gap-4 sm:grid-cols-2">
                  {virtualCards.map((card) => {
                    const isVisible = visibleCardIds[card.id];
                    return (
                      <div key={card.id} className="rounded-2xl border border-gray-700/60 bg-gradient-to-br from-gray-900 to-gray-800 p-5">
                        <div className="flex items-start justify-between gap-3 mb-4">
                          <div>
                            <p className="text-xs text-gray-400">{card.network} Virtual Card</p>
                            <h4 className="text-white font-bold mt-1">{card.name}</h4>
                          </div>
                          <span className={`px-2 py-1 rounded-full text-xs font-bold ${
                            card.status === 'active' ? 'bg-emerald-500/15 text-emerald-400' :
                            card.status === 'frozen' ? 'bg-yellow-500/15 text-yellow-400' :
                            'bg-blue-500/15 text-blue-400'
                          }`}>
                            {card.status}
                          </span>
                        </div>

                        <div className="rounded-xl bg-black/30 p-4 mb-4">
                          <p className="text-xs text-gray-400 mb-1">Card number</p>
                          <p className="font-mono text-white tracking-wide">
                            {isVisible ? formatMaskedNumber(card.last4) : '•••• •••• •••• ••••'}
                          </p>
                          <div className="flex items-center justify-between mt-4 text-xs text-gray-400">
                            <span>Expires {card.expiry}</span>
                            <span>{card.currency} {Number(card.limit || 0).toLocaleString()}</span>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-2">
                          <button
                            onClick={() => toggleCardVisibility(card.id)}
                            className="py-2 rounded-xl bg-gray-700/60 hover:bg-gray-700 text-white text-sm font-semibold flex items-center justify-center gap-2"
                          >
                            {isVisible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                            {isVisible ? 'Hide' : 'Show'}
                          </button>
                          <button
                            onClick={() => copyCardToken(card)}
                            className="py-2 rounded-xl bg-gray-700/60 hover:bg-gray-700 text-white text-sm font-semibold flex items-center justify-center gap-2"
                          >
                            {copied?.startsWith(`bp_card_${card.id}`) ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
                            Copy token
                          </button>
                          <button
                            onClick={() => deleteVirtualCard(card.id)}
                            className="col-span-2 py-2 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-300 text-sm font-semibold flex items-center justify-center gap-2"
                          >
                            <Trash2 className="h-4 w-4" />
                            Remove card
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          <div className="mt-6 rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-5">
            <h3 className="font-semibold text-white mb-3 flex items-center gap-2">
              <Shield className="h-5 w-5 text-emerald-400" />
              Suggested next improvements
            </h3>
            <ul className="grid gap-2 text-sm text-gray-300 md:grid-cols-2">
              <li>• Connect a PCI-DSS card issuer such as Stripe Issuing, Marqate, or Lithic for real card creation.</li>
              <li>• Add freeze/unfreeze, merchant category controls, daily limits, and one-time card numbers.</li>
              <li>• Add 3DS authentication, KYC/KYB checks, sanctions screening, and transaction monitoring.</li>
              <li>• Add real-time webhooks, accounting exports, approval workflows, and team card permissions.</li>
            </ul>
          </div>
        </section>

        {/* Security Notice */}
        <div className="rounded-xl p-4 bg-yellow-900/20 border border-yellow-700">
          <div className="flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-yellow-500 flex-shrink-0 mt-0.5" />
            <div>
              <h3 className={`font-semibold mb-1 ${theme === 'dark' ? 'text-yellow-400' : 'text-yellow-800'}`}>
                Security Recommendations
              </h3>
              <ul className={`text-sm ${theme === 'dark' ? 'text-yellow-300' : 'text-yellow-700'} space-y-1`}>
                <li>• Keep your cold wallet seed phrase offline and in a secure location</li>
                <li>• Use multi-signature for large transfers from cold wallet</li>
                <li>• Enable 2FA on your exchange accounts</li>
                <li>• Regularly audit your wallet addresses</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
