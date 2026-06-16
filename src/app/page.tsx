'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabaseClient';
import {
  ArrowRight,
  BarChart3,
  Check,
  Coins,
  Copy,
  CreditCard,
  Globe,
  Layers,
  Lock,
  QrCode,
  ShieldCheck,
  Sparkles,
  Terminal,
  Wallet,
  Zap,
} from 'lucide-react';

type IconType = React.ElementType;

type AssetOption = {
  id: string;
  label: string;
  symbol: string;
  icon: IconType;
};

type NetworkOption = {
  id: string;
  label: string;
  feeLabel: string;
  settlement: string;
  icon: IconType;
};

type PaymentRequest = {
  id: string;
  amount: string;
  asset: string;
  network: string;
  status: 'pending' | 'ready';
  createdAt: string;
  url: string;
};

const assets: AssetOption[] = [
  { id: 'usdt', label: 'Tether', symbol: 'USDT', icon: Coins },
  { id: 'btc', label: 'Bitcoin', symbol: 'BTC', icon: Coins },
  { id: 'eth', label: 'Ethereum', symbol: 'ETH', icon: Coins },
  { id: 'ton', label: 'TON', symbol: 'TON', icon: Coins },
];

const networks: NetworkOption[] = [
  { id: 'trc20', label: 'TRON TRC-20', feeLabel: 'Low', settlement: 'Instant', icon: Zap },
  { id: 'erc20', label: 'Ethereum ERC-20', feeLabel: 'Medium', settlement: 'Fast', icon: Layers },
  { id: 'bsc', label: 'BNB Chain', feeLabel: 'Low', settlement: 'Instant', icon: Zap },
  { id: 'solana', label: 'Solana', feeLabel: 'Very low', settlement: 'Instant', icon: Globe },
];

const features = [
  {
    icon: CreditCard,
    title: 'Crypto checkout',
    text: 'Accept USDT, BTC, ETH, TON and other assets with a clean payment page.',
  },
  {
    icon: ShieldCheck,
    title: 'Risk controls',
    text: 'Fraud signals, rate limits and webhook confirmations help protect every transaction.',
  },
  {
    icon: Terminal,
    title: 'API-first',
    text: 'Create invoices, listen for payment events and automate your business flow.',
  },
  {
    icon: Wallet,
    title: 'Multi-chain',
    text: 'Route payments across TRON, Ethereum, BNB Chain and Solana from one workspace.',
  },
];

const stats = [
  { label: 'Supported assets', value: '100+' },
  { label: 'Average settlement', value: '< 1m' },
  { label: 'Uptime target', value: '99.9%' },
  { label: 'API latency', value: '120ms' },
];

const codeSnippet = `POST /api/payments/requests
{
  "amount": 49.99,
  "currency": "USDT",
  "network": "trc20",
  "callback_url": "https://yourapp.com/api/webhooks/payments"
}`;

async function getAuthHeaders(): Promise<HeadersInit> {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  return token ? { 'content-type': 'application/json', authorization: `Bearer ${token}` } : { 'content-type': 'application/json' };
}

export default function Home() {
  const [amount, setAmount] = useState<string>('100');
  const [assetId, setAssetId] = useState<string>('usdt');
  const [networkId, setNetworkId] = useState<string>('trc20');
  const [merchantEmail, setMerchantEmail] = useState<string>('');
  const [description, setDescription] = useState<string>('Digital product payment');
  const [paymentRequest, setPaymentRequest] = useState<PaymentRequest | null>(null);
  const [paymentError, setPaymentError] = useState<string>('');
  const [isCreatingPayment, setIsCreatingPayment] = useState<boolean>(false);
  const [copied, setCopied] = useState<boolean>(false);
  const [origin, setOrigin] = useState<string>('');

  useEffect(() => {
    setOrigin(window.location.origin);
  }, []);

  const selectedAsset = assets.find((asset) => asset.id === assetId) ?? assets[0];
  const selectedNetwork = networks.find((network) => network.id === networkId) ?? networks[0];
  const numericAmount = Number(amount || 0);
  const feeRate = selectedNetwork.id === 'solana' ? 0.001 : selectedNetwork.id === 'erc20' ? 0.008 : 0.003;
  const fee = numericAmount * feeRate;
  const total = numericAmount + fee;
  const paymentLink = paymentRequest?.url ?? (paymentRequest && origin ? `${origin}/pay/${paymentRequest.id}` : '#create-payment');

  const SelectedAssetIcon = selectedAsset.icon;
  const SelectedNetworkIcon = selectedNetwork.icon;

  const createPaymentRequest = async () => {
    if (numericAmount <= 0) return;

    setIsCreatingPayment(true);
    setPaymentError('');

    try {
      const response = await fetch('/api/payments/requests', {
        method: 'POST',
        headers: await getAuthHeaders(),
        body: JSON.stringify({
          amount,
          currency: selectedAsset.symbol,
          network: selectedNetwork.id,
          description,
          lifetime: 3600,
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? 'Unable to create BlackPayments request');

      setPaymentRequest({
        id: data.payment.id,
        amount: data.payment.amount,
        asset: data.payment.currency,
        network: data.payment.network,
        status: 'ready',
        createdAt: data.payment.created_at,
        url: data.payment.url,
      });
    } catch (error) {
      setPaymentError(error instanceof Error ? error.message : 'Unable to create BlackPayments request');
    } finally {
      setIsCreatingPayment(false);
    }
  };

  const copyPaymentLink = async () => {
    if (!paymentLink || paymentLink === '#create-payment') return;
    await navigator.clipboard.writeText(paymentLink);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  };

  const resetPaymentRequest = () => {
    setPaymentRequest(null);
    setPaymentError('');
    setCopied(false);
  };

  const previewItems = useMemo(
    () => [
      { label: 'Merchant', value: merchantEmail || 'merchant@business.com' },
      { label: 'Description', value: description },
      { label: 'Network', value: selectedNetwork.label },
      { label: 'Settlement', value: selectedNetwork.settlement },
    ],
    [description, merchantEmail, selectedNetwork.label, selectedNetwork.settlement]
  );

  return (
    <div className="min-h-screen overflow-hidden bg-[#070a12] text-white">
      <div className="pointer-events-none fixed inset-0 -z-10">
        <div className="absolute left-1/2 top-0 h-[420px] w-[420px] -translate-x-1/2 rounded-full bg-indigo-500/20 blur-3xl" />
        <div className="absolute right-0 top-32 h-[360px] w-[360px] rounded-full bg-emerald-500/10 blur-3xl" />
        <div className="absolute bottom-0 left-10 h-[360px] w-[360px] rounded-full bg-blue-500/10 blur-3xl" />
        <div className="absolute inset-0 opacity-[0.08]" style={{ backgroundImage: 'radial-gradient(circle at 1px 1px, rgba(255,255,255,0.6) 1px, transparent 0)', backgroundSize: '32px 32px' }} />
      </div>

      <section className="relative mx-auto flex max-w-7xl flex-col gap-10 px-4 pb-16 pt-16 sm:px-6 lg:px-8 lg:pb-24 lg:pt-24 xl:flex-row xl:items-center">
        <div className="max-w-3xl">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-indigo-100 shadow-2xl shadow-indigo-950/30 backdrop-blur">
            <Sparkles className="h-4 w-4 text-emerald-300" />
            No account required. Start accepting crypto payments instantly.
          </div>

          <h1 className="text-5xl font-black tracking-tight text-white sm:text-6xl lg:text-7xl">
            Crypto payments for modern businesses
          </h1>
          <p className="mt-6 max-w-2xl text-lg leading-8 text-slate-300">
            BlackPayments gives you a fast checkout, invoice links, webhooks and multi-chain settlement without the old wallet-only experience.
          </p>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <a href="#create-payment" className="inline-flex items-center justify-center gap-2 rounded-2xl bg-emerald-400 px-6 py-4 font-bold text-slate-950 transition hover:bg-emerald-300">
              Create payment
              <ArrowRight className="h-5 w-5" />
            </a>
            <Link href="/auth" className="inline-flex items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-6 py-4 font-bold text-white transition hover:bg-white/10">
              Sign in
            </Link>
            <a href="#api" className="inline-flex items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-6 py-4 font-bold text-white transition hover:bg-white/10">
              View API
            </a>
          </div>

          <div className="mt-10 grid max-w-2xl grid-cols-2 gap-3 sm:grid-cols-4">
            {stats.map((stat) => (
              <div key={stat.label} className="rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur">
                <div className="text-2xl font-black text-white">{stat.value}</div>
                <div className="mt-1 text-xs text-slate-400">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>

        <div id="create-payment" className="w-full xl:max-w-xl">
          <div className="relative overflow-hidden rounded-[2rem] border border-white/10 bg-slate-950/70 p-5 shadow-2xl shadow-indigo-950/50 backdrop-blur-xl sm:p-6">
            <div className="absolute right-6 top-6 flex items-center gap-2 rounded-full border border-emerald-400/20 bg-emerald-400/10 px-3 py-1 text-xs font-bold text-emerald-300">
              <Check className="h-3.5 w-3.5" />
              Ready
            </div>

            <div className="mb-6">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500 to-emerald-400">
                  <Wallet className="h-6 w-6 text-white" />
                </div>
                <div>
                  <p className="text-sm text-slate-400">Payment preview</p>
                  <h2 className="text-2xl font-black text-white">Checkout invoice</h2>
                </div>
              </div>
            </div>

            <div className="grid gap-4">
              <label className="block">
                <span className="mb-2 block text-sm font-semibold text-slate-300">Amount</span>
                <div className="relative">
                  <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">$</span>
                  <input
                    value={amount}
                    onChange={(event) => setAmount(event.target.value.replace(/[^\d.]/g, ''))}
                    className="w-full rounded-2xl border border-white/10 bg-white/5 py-4 pl-8 pr-4 font-semibold text-white outline-none transition focus:border-emerald-400/70 focus:bg-white/[0.07]"
                    inputMode="decimal"
                    placeholder="0.00"
                  />
                </div>
              </label>

              <div className="grid gap-4 sm:grid-cols-2">
                <label className="block">
                  <span className="mb-2 block text-sm font-semibold text-slate-300">Asset</span>
                  <select
                    value={assetId}
                    onChange={(event) => setAssetId(event.target.value)}
                    className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-4 font-semibold text-white outline-none transition focus:border-emerald-400/70 focus:bg-white/[0.07]"
                  >
                    {assets.map((asset) => {
                      const AssetIcon = asset.icon;
                      return (
                        <option key={asset.id} value={asset.id} className="bg-slate-950 text-white">
                          {asset.symbol} — {asset.label}
                        </option>
                      );
                    })}
                  </select>
                </label>

                <label className="block">
                  <span className="mb-2 block text-sm font-semibold text-slate-300">Network</span>
                  <select
                    value={networkId}
                    onChange={(event) => setNetworkId(event.target.value)}
                    className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-4 font-semibold text-white outline-none transition focus:border-emerald-400/70 focus:bg-white/[0.07]"
                  >
                    {networks.map((network) => {
                      const NetworkIcon = network.icon;
                      return (
                        <option key={network.id} value={network.id} className="bg-slate-950 text-white">
                          {network.label}
                        </option>
                      );
                    })}
                  </select>
                </label>
              </div>

              <label className="block">
                <span className="mb-2 block text-sm font-semibold text-slate-300">Merchant email</span>
                <input
                  value={merchantEmail}
                  onChange={(event) => setMerchantEmail(event.target.value)}
                  className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-4 font-semibold text-white outline-none transition focus:border-emerald-400/70 focus:bg-white/[0.07]"
                  placeholder="merchant@business.com"
                />
              </label>

              <label className="block">
                <span className="mb-2 block text-sm font-semibold text-slate-300">Description</span>
                <input
                  value={description}
                  onChange={(event) => setDescription(event.target.value)}
                  className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-4 font-semibold text-white outline-none transition focus:border-emerald-400/70 focus:bg-white/[0.07]"
                  placeholder="Order #1024"
                />
              </label>
            </div>

            <button
              onClick={createPaymentRequest}
              disabled={isCreatingPayment || numericAmount <= 0}
              className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-emerald-400 px-6 py-4 font-black text-slate-950 transition hover:bg-emerald-300 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isCreatingPayment ? 'Creating BlackPayments request...' : 'Create payment request'}
              <ArrowRight className="h-5 w-5" />
            </button>

            {paymentError && (
              <div className="mt-4 rounded-2xl border border-rose-400/30 bg-rose-400/10 p-4 text-sm text-rose-100">
                {paymentError}
              </div>
            )}

            {paymentRequest && (
              <div className="mt-6 rounded-3xl border border-emerald-400/20 bg-emerald-400/10 p-5">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-sm text-emerald-200">BlackPayments request created</p>
                    <p className="mt-1 break-all font-mono text-sm text-white">{paymentRequest.id}</p>
                    <p className="mt-1 text-xs uppercase tracking-wide text-emerald-300">{paymentRequest.status}</p>
                  </div>
                  <button onClick={copyPaymentLink} className="rounded-xl border border-white/10 p-2 text-white transition hover:bg-white/10">
                    {copied ? <Check className="h-4 w-4 text-emerald-300" /> : <Copy className="h-4 w-4" />}
                  </button>
                </div>

                <div className="mt-5 grid gap-3 sm:grid-cols-2">
                  <div className="rounded-2xl bg-slate-950/60 p-4">
                    <p className="text-xs text-slate-400">Pay amount</p>
                    <p className="mt-1 text-2xl font-black text-white">{total.toFixed(2)} {selectedAsset.symbol}</p>
                  </div>
                  <div className="rounded-2xl bg-slate-950/60 p-4">
                    <p className="text-xs text-slate-400">Network fee</p>
                    <p className="mt-1 text-2xl font-black text-white">{fee.toFixed(4)} {selectedAsset.symbol}</p>
                  </div>
                </div>

                <div className="mt-4 flex items-center gap-3 rounded-2xl bg-white/5 p-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-500/20">
                    <SelectedAssetIcon className="h-6 w-6 text-indigo-300" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-white">{selectedAsset.label}</p>
                    <p className="text-xs text-slate-400">{selectedNetwork.label} · {selectedNetwork.settlement}</p>
                  </div>
                  <SelectedNetworkIcon className="h-5 w-5 text-emerald-300" />
                </div>

                <div className="mt-4 rounded-2xl border border-dashed border-white/15 p-4 text-center">
                  <QrCode className="mx-auto h-16 w-16 text-emerald-300" />
                  <p className="mt-2 text-xs text-slate-400">QR code placeholder for {paymentRequest.id}</p>
                </div>

                <div className="mt-4 flex gap-3">
                  <a
                    href={paymentLink}
                    className="inline-flex flex-1 items-center justify-center rounded-2xl bg-white px-5 py-3 font-black text-slate-950 transition hover:bg-slate-200 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    Pay now
                  </a>
                  <button onClick={resetPaymentRequest} className="inline-flex flex-1 items-center justify-center rounded-2xl border border-white/10 px-5 py-3 font-black text-white transition hover:bg-white/10">
                    New
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </section>

      <section className="mx-auto grid max-w-7xl gap-4 px-4 sm:grid-cols-2 lg:grid-cols-4 lg:px-8">
        {features.map((feature) => {
          const Icon = feature.icon;
          return (
            <div key={feature.title} className="group rounded-3xl border border-white/10 bg-white/[0.035] p-6 transition hover:-translate-y-1 hover:border-emerald-400/30 hover:bg-white/[0.06]">
              <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-400/10 text-emerald-300 transition group-hover:bg-emerald-400 group-hover:text-slate-950">
                <Icon className="h-6 w-6" />
              </div>
              <h3 className="text-lg font-black text-white">{feature.title}</h3>
              <p className="mt-3 text-sm leading-6 text-slate-400">{feature.text}</p>
            </div>
          );
        })}
      </section>

      <section className="mx-auto mt-16 max-w-7xl px-4 lg:px-8">
        <div className="overflow-hidden rounded-[2rem] border border-white/10 bg-white/[0.035]">
          <div className="grid gap-8 p-6 lg:grid-cols-[1fr_1.1fr] lg:p-10">
            <div>
              <p className="text-sm font-bold uppercase tracking-[0.25em] text-emerald-300">Payment flow</p>
              <h2 className="mt-4 text-3xl font-black text-white sm:text-4xl">Create. Pay. Confirm.</h2>
              <p className="mt-4 text-slate-300">
                The new flow is built around payment links and invoice pages, not a sign-up wall. Merchants can preview amounts, choose networks and send a checkout link immediately.
              </p>

              <div className="mt-8 space-y-4">
                {previewItems.map((item) => (
                  <div key={item.label} className="flex items-center justify-between gap-4 rounded-2xl border border-white/10 bg-slate-950/40 p-4">
                    <span className="text-sm text-slate-400">{item.label}</span>
                    <span className="text-sm font-bold text-white">{item.value}</span>
                  </div>
                ))}
              </div>
            </div>

            <div id="api" className="rounded-3xl border border-white/10 bg-slate-950 p-5 shadow-2xl shadow-black/30">
              <div className="mb-4 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="h-3 w-3 rounded-full bg-red-400" />
                  <div className="h-3 w-3 rounded-full bg-yellow-400" />
                  <div className="h-3 w-3 rounded-full bg-emerald-400" />
                </div>
                <Terminal className="h-5 w-5 text-slate-400" />
              </div>
              <pre className="overflow-x-auto rounded-2xl bg-black/60 p-5 text-sm leading-6 text-slate-300"><code>{codeSnippet}</code></pre>
              <div className="mt-5 grid gap-3 sm:grid-cols-3">
                <div className="rounded-2xl bg-white/5 p-4">
                  <p className="text-xs text-slate-400">Fee</p>
                  <p className="mt-1 font-black text-white">{(feeRate * 100).toFixed(2)}%</p>
                </div>
                <div className="rounded-2xl bg-white/5 p-4">
                  <p className="text-xs text-slate-400">Settlement</p>
                  <p className="mt-1 font-black text-white">{selectedNetwork.settlement}</p>
                </div>
                <div className="rounded-2xl bg-white/5 p-4">
                  <p className="text-xs text-slate-400">Security</p>
                  <p className="mt-1 font-black text-white">RLS</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto mt-16 max-w-7xl px-4 lg:px-8">
        <div className="rounded-[2rem] border border-emerald-400/20 bg-gradient-to-br from-emerald-400/10 via-indigo-500/10 to-slate-950 p-8 text-center sm:p-12">
          <ShieldCheck className="mx-auto h-12 w-12 text-emerald-300" />
          <h2 className="mt-5 text-3xl font-black text-white sm:text-4xl">Built for checkout-first crypto commerce</h2>
          <p className="mx-auto mt-4 max-w-2xl text-slate-300">
            Keep the wallet tools in the app, but lead with a payment gateway experience: invoice links, network selection, QR display and webhook-ready events.
          </p>
          <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
            <Link href="/send" className="rounded-2xl bg-white px-6 py-4 font-black text-slate-950 transition hover:bg-slate-200">
              Open Send
            </Link>
            <Link href="/p2p" className="rounded-2xl border border-white/10 bg-white/5 px-6 py-4 font-black text-white transition hover:bg-white/10">
              Explore P2P
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
