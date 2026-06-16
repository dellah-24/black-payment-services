'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import {
  ArrowRight,
  Check,
  Copy,
  CreditCard,
  ExternalLink,
  KeyRound,
  Loader2,
  Plus,
  QrCode,
  RefreshCw,
  ShieldCheck,
  Webhook,
  ArrowLeftRight,
} from 'lucide-react';

type PaymentStatus = 'NEW' | 'WAIT' | 'PAID' | 'FAIL' | 'EXPIRED' | 'CANCEL';

type PaymentInvoice = {
  id: string;
  order_id: string | null;
  amount: string;
  currency: string;
  network: string;
  description: string | null;
  status: PaymentStatus;
  url: string;
  callback_url: string | null;
  tx_hash: string | null;
  expires_at: string;
  created_at: string;
  paid_at: string | null;
};

type ApiKey = {
  id: string;
  name: string;
  public_key: string;
  permissions: string[];
  status: string;
  created_at: string;
};

type Webhook = {
  id: string;
  url: string;
  events: string[];
  status: string;
  created_at: string;
};

type ExchangeQuote = {
  from: string;
  to: string;
  amount: string;
  rate: string;
  result: string;
  fee: string;
  fee_rate: string;
};

async function getAuthHeaders(): Promise<HeadersInit> {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  return token ? { 'content-type': 'application/json', authorization: `Bearer ${token}` } : { 'content-type': 'application/json' };
}

const currencies = ['USDT', 'TRX', 'ETH', 'BTC', 'TON', 'SOL'];
const networks = ['trc20', 'erc20', 'bsc', 'polygon', 'bitcoin', 'ton', 'solana'];
const webhookEvents = ['payment.created', 'payment.wait', 'payment.paid', 'payment.expired', 'payment.fail', 'payment.cancel'];

export default function PaymentsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [creatingKey, setCreatingKey] = useState(false);
  const [creatingWebhook, setCreatingWebhook] = useState(false);
  const [payments, setPayments] = useState<PaymentInvoice[]>([]);
  const [apiKeys, setApiKeys] = useState<ApiKey[]>([]);
  const [webhooks, setWebhooks] = useState<Webhook[]>([]);
  const [newSecret, setNewSecret] = useState('');
  const [error, setError] = useState('');
  const [copied, setCopied] = useState('');
  const [form, setForm] = useState({
    amount: '100',
    currency: 'USDT',
    network: 'trc20',
    description: 'Cryptomus-compatible invoice',
    order_id: '',
    callback_url: '',
    success_url: '',
    cancel_url: '',
    lifetime: 3600,
  });
  const [apiKeyForm, setApiKeyForm] = useState({ name: 'Production key', permissions: ['read', 'write'] });
  const [webhookForm, setWebhookForm] = useState({ url: '', events: webhookEvents });
  const [exchangeForm, setExchangeForm] = useState({ from: 'USDT', to: 'TRX', amount: '100' });
  const [quote, setQuote] = useState<ExchangeQuote | null>(null);

  useEffect(() => {
    const boot = async () => {
      const { data } = await supabase.auth.getSession();
      if (!data.session) {
        router.push('/auth');
        return;
      }
      await Promise.all([loadPayments(), loadApiKeys(), loadWebhooks(), loadQuote()]);
      setLoading(false);
    };
    boot();
  }, []);

  const selectedPaymentUrl = useMemo(() => payments[0]?.url, [payments]);

  const loadPayments = async () => {
    const response = await fetch('/api/payments/requests', { headers: await getAuthHeaders() });
    if (response.status === 401) {
      router.push('/auth');
      return [];
    }
    if (!response.ok) throw new Error('Unable to load payments');
    const data = await response.json();
    setPayments(data.payments ?? []);
    return [];
  };

  const loadApiKeys = async () => {
    const response = await fetch('/api/merchant/api-keys', { headers: await getAuthHeaders() });
    if (response.status === 401) {
      router.push('/auth');
      return [];
    }
    if (!response.ok) return [];
    const data = await response.json();
    setApiKeys(data.apiKeys ?? []);
    return [];
  };

  const loadWebhooks = async () => {
    const response = await fetch('/api/payments/webhooks', { headers: await getAuthHeaders() });
    if (response.status === 401) {
      router.push('/auth');
      return [];
    }
    if (!response.ok) return [];
    const data = await response.json();
    setWebhooks(data.webhooks ?? []);
    return [];
  };

  const loadQuote = async () => {
    const response = await fetch('/api/exchange', {
      method: 'POST',
      headers: await getAuthHeaders(),
      body: JSON.stringify(exchangeForm),
    });
    if (response.ok) {
      const data = await response.json();
      setQuote(data.quote);
    }
  };

  const createPayment = async () => {
    setError('');
    setCreating(true);
    try {
      const response = await fetch('/api/payments/requests', {
        method: 'POST',
        headers: await getAuthHeaders(),
        body: JSON.stringify({
          ...form,
          is_fee_paid_by_user: false,
          is_payment_multiple: false,
          is_html_notification: false,
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? 'Unable to create invoice');
      setPayments((current) => [data.payment, ...current]);
      setForm((current) => ({ ...current, amount: '100', order_id: '' }));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to create invoice');
    } finally {
      setCreating(false);
    }
  };

  const createApiKey = async () => {
    setCreatingKey(true);
    setNewSecret('');
    try {
      const response = await fetch('/api/merchant/api-keys', {
        method: 'POST',
        headers: await getAuthHeaders(),
        body: JSON.stringify(apiKeyForm),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? 'Unable to create API key');
      setApiKeys((current) => [data.apiKey, ...current]);
      setNewSecret(data.apiKey.secret);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to create API key');
    } finally {
      setCreatingKey(false);
    }
  };

  const createWebhook = async () => {
    setCreatingWebhook(true);
    try {
      const response = await fetch('/api/payments/webhooks', {
        method: 'POST',
        headers: await getAuthHeaders(),
        body: JSON.stringify(webhookForm),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? 'Unable to create webhook');
      setWebhooks((current) => [data.webhook, ...current]);
      setWebhookForm((current) => ({ ...current, url: '' }));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to create webhook');
    } finally {
      setCreatingWebhook(false);
    }
  };

  const revokeApiKey = async (id: string) => {
    await fetch(`/api/merchant/api-keys/${id}`, { method: 'DELETE', headers: await getAuthHeaders() });
    await loadApiKeys();
  };

  const deleteWebhook = async (id: string) => {
    await fetch(`/api/payments/webhooks/${id}`, { method: 'DELETE', headers: await getAuthHeaders() });
    await loadWebhooks();
  };

  const copy = async (value: string, key = value) => {
    await navigator.clipboard.writeText(value);
    setCopied(key);
    setTimeout(() => setCopied(''), 1800);
  };

  const refreshAll = async () => {
    setLoading(true);
    await Promise.all([loadPayments(), loadApiKeys(), loadWebhooks(), loadQuote()]);
    setLoading(false);
  };

  if (loading) {
    return <div className="min-h-screen bg-[#070a12] p-8 text-white">Loading Cryptomus-compatible gateway...</div>;
  }

  return (
    <div className="min-h-screen bg-[#070a12] text-white">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <Link href="/" className="inline-flex items-center gap-2 text-sm font-semibold text-slate-300 hover:text-white">
              <ArrowLeftRight className="h-4 w-4" />
              Back to dashboard
            </Link>
            <h1 className="mt-4 text-4xl font-black tracking-tight">Merchant gateway</h1>
            <p className="mt-2 text-slate-300">Create invoices, manage API keys, configure webhooks, and quote exchanges like a Cryptomus merchant workspace.</p>
          </div>
          <button onClick={refreshAll} className="inline-flex items-center gap-2 rounded-2xl border border-white/10 px-4 py-3 font-bold hover:bg-white/10">
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>

        {error && <div className="mb-6 rounded-2xl border border-rose-400/30 bg-rose-400/10 p-4 text-rose-100">{error}</div>}

        <div className="grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
          <section className="rounded-[2rem] border border-white/10 bg-slate-950/70 p-6 shadow-2xl shadow-black/30">
            <div className="mb-6 flex items-center justify-between">
              <div>
                <p className="text-sm font-bold uppercase tracking-[0.25em] text-emerald-300">Cryptomus payment API</p>
                <h2 className="mt-2 text-2xl font-black">Create invoice</h2>
              </div>
              <CreditCard className="h-8 w-8 text-emerald-300" />
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <label className="block">
                <span className="mb-2 block text-sm text-slate-300">Amount</span>
                <input value={form.amount} onChange={(event) => setForm({ ...form, amount: event.target.value })} className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none focus:border-emerald-400" inputMode="decimal" />
              </label>
              <label className="block">
                <span className="mb-2 block text-sm text-slate-300">Currency</span>
                <select value={form.currency} onChange={(event) => setForm({ ...form, currency: event.target.value })} className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none focus:border-emerald-400">
                  {currencies.map((currency) => <option key={currency} value={currency}>{currency}</option>)}
                </select>
              </label>
              <label className="block">
                <span className="mb-2 block text-sm text-slate-300">Network</span>
                <select value={form.network} onChange={(event) => setForm({ ...form, network: event.target.value })} className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none focus:border-emerald-400">
                  {networks.map((network) => <option key={network} value={network}>{network}</option>)}
                </select>
              </label>
              <label className="block">
                <span className="mb-2 block text-sm text-slate-300">Lifetime seconds</span>
                <input value={form.lifetime} onChange={(event) => setForm({ ...form, lifetime: Number(event.target.value) })} type="number" min="60" className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none focus:border-emerald-400" />
              </label>
              <label className="block md:col-span-2">
                <span className="mb-2 block text-sm text-slate-300">Order ID</span>
                <input value={form.order_id} onChange={(event) => setForm({ ...form, order_id: event.target.value })} className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none focus:border-emerald-400" placeholder="Optional merchant order id" />
              </label>
              <label className="block md:col-span-2">
                <span className="mb-2 block text-sm text-slate-300">Description</span>
                <input value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none focus:border-emerald-400" />
              </label>
              <label className="block md:col-span-2">
                <span className="mb-2 block text-sm text-slate-300">Callback URL</span>
                <input value={form.callback_url} onChange={(event) => setForm({ ...form, callback_url: event.target.value })} className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none focus:border-emerald-400" placeholder="https://yourapp.com/api/webhooks/payments" />
              </label>
            </div>

            <button onClick={createPayment} disabled={creating} className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-emerald-400 px-6 py-4 font-black text-slate-950 transition hover:bg-emerald-300 disabled:opacity-60">
              {creating ? <Loader2 className="h-5 w-5 animate-spin" /> : <Plus className="h-5 w-5" />}
              Create invoice
            </button>

            {selectedPaymentUrl && (
              <div className="mt-6 rounded-3xl border border-emerald-400/20 bg-emerald-400/10 p-5">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-sm text-emerald-200">Latest invoice link</p>
                    <p className="mt-1 break-all font-mono text-sm text-white">{selectedPaymentUrl}</p>
                  </div>
                  <button onClick={() => copy(selectedPaymentUrl, 'invoice')} className="rounded-xl border border-white/10 p-2 hover:bg-white/10">
                    {copied === 'invoice' ? <Check className="h-4 w-4 text-emerald-300" /> : <Copy className="h-4 w-4" />}
                  </button>
                </div>
                <div className="mt-4 flex gap-3">
                  <a href={selectedPaymentUrl} target="_blank" rel="noreferrer" className="inline-flex flex-1 items-center justify-center gap-2 rounded-2xl bg-white px-5 py-3 font-black text-slate-950">
                    Open <ExternalLink className="h-4 w-4" />
                  </a>
                  <a href="#invoices" className="inline-flex flex-1 items-center justify-center rounded-2xl border border-white/10 px-5 py-3 font-black hover:bg-white/10">
                    View invoices
                  </a>
                </div>
              </div>
            )}
          </section>

          <section className="rounded-[2rem] border border-white/10 bg-slate-950/70 p-6">
            <div className="mb-6 flex items-center justify-between">
              <div>
                <p className="text-sm font-bold uppercase tracking-[0.25em] text-indigo-300">Exchange</p>
                <h2 className="mt-2 text-2xl font-black">Quote</h2>
              </div>
              <ArrowLeftRight className="h-8 w-8 text-indigo-300" />
            </div>
            <div className="grid gap-4">
              <label className="block">
                <span className="mb-2 block text-sm text-slate-300">From</span>
                <select value={exchangeForm.from} onChange={(event) => setExchangeForm({ ...exchangeForm, from: event.target.value })} className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none focus:border-indigo-400">
                  {currencies.map((currency) => <option key={currency} value={currency}>{currency}</option>)}
                </select>
              </label>
              <label className="block">
                <span className="mb-2 block text-sm text-slate-300">To</span>
                <select value={exchangeForm.to} onChange={(event) => setExchangeForm({ ...exchangeForm, to: event.target.value })} className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none focus:border-indigo-400">
                  {currencies.map((currency) => <option key={currency} value={currency}>{currency}</option>)}
                </select>
              </label>
              <label className="block">
                <span className="mb-2 block text-sm text-slate-300">Amount</span>
                <input value={exchangeForm.amount} onChange={(event) => setExchangeForm({ ...exchangeForm, amount: event.target.value })} inputMode="decimal" className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none focus:border-indigo-400" />
              </label>
            </div>
            <button onClick={loadQuote} className="mt-4 w-full rounded-2xl border border-white/10 px-5 py-3 font-black hover:bg-white/10">Quote exchange</button>
            {quote && (
              <div className="mt-5 rounded-3xl border border-indigo-400/20 bg-indigo-400/10 p-5">
                <p className="text-sm text-indigo-200">You receive</p>
                <p className="mt-2 text-3xl font-black">{quote.result} {quote.to}</p>
                <p className="mt-2 text-sm text-slate-300">Rate {quote.rate} · fee {quote.fee_rate}</p>
              </div>
            )}
          </section>
        </div>

        <section id="invoices" className="mt-6 rounded-[2rem] border border-white/10 bg-slate-950/70 p-6">
          <div className="mb-6 flex items-center justify-between">
            <div>
              <p className="text-sm font-bold uppercase tracking-[0.25em] text-emerald-300">Invoices</p>
              <h2 className="mt-2 text-2xl font-black">Payment links and status</h2>
            </div>
            <Link href="/history" className="inline-flex items-center gap-2 rounded-2xl border border-white/10 px-4 py-3 font-bold hover:bg-white/10">
              History <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px] text-left text-sm">
              <thead className="text-xs uppercase tracking-wide text-slate-400">
                <tr>
                  <th className="pb-4 pr-4">Status</th>
                  <th className="pb-4 pr-4">Amount</th>
                  <th className="pb-4 pr-4">Order</th>
                  <th className="pb-4 pr-4">Network</th>
                  <th className="pb-4 pr-4">Created</th>
                  <th className="pb-4">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/10">
                {payments.map((payment) => (
                  <tr key={payment.id}>
                    <td className="py-4 pr-4"><span className="rounded-full bg-emerald-400/10 px-3 py-1 text-xs font-black text-emerald-300">{payment.status}</span></td>
                    <td className="py-4 pr-4 font-black">{payment.amount} {payment.currency}</td>
                    <td className="py-4 pr-4 text-slate-300">{payment.order_id || payment.description || '—'}</td>
                    <td className="py-4 pr-4 text-slate-300">{payment.network}</td>
                    <td className="py-4 pr-4 text-slate-300">{new Date(payment.created_at).toLocaleString()}</td>
                    <td className="py-4">
                      <div className="flex gap-2">
                        <a href={payment.url} target="_blank" rel="noreferrer" className="rounded-xl border border-white/10 px-3 py-2 font-bold hover:bg-white/10">Pay</a>
                        <button onClick={() => copy(payment.url, payment.id)} className="rounded-xl border border-white/10 px-3 py-2 font-bold hover:bg-white/10">{copied === payment.id ? 'Copied' : 'Copy'}</button>
                      </div>
                    </td>
                  </tr>
                ))}
                {!payments.length && <tr><td colSpan={6} className="py-10 text-center text-slate-400">No invoices yet. Create one above.</td></tr>}
              </tbody>
            </table>
          </div>
        </section>

        <div className="mt-6 grid gap-6 lg:grid-cols-2">
          <section className="rounded-[2rem] border border-white/10 bg-slate-950/70 p-6">
            <div className="mb-6 flex items-center justify-between">
              <div>
                <p className="text-sm font-bold uppercase tracking-[0.25em] text-indigo-300">API keys</p>
                <h2 className="mt-2 text-2xl font-black">Merchant access</h2>
              </div>
              <KeyRound className="h-8 w-8 text-indigo-300" />
            </div>
            <div className="grid gap-3 md:grid-cols-[1fr_auto]">
              <input value={apiKeyForm.name} onChange={(event) => setApiKeyForm({ ...apiKeyForm, name: event.target.value })} className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none focus:border-indigo-400" placeholder="Key name" />
              <button onClick={createApiKey} disabled={creatingKey} className="rounded-2xl bg-indigo-400 px-5 py-3 font-black text-slate-950 disabled:opacity-60">
                {creatingKey ? 'Creating...' : 'Create key'}
              </button>
            </div>
            {newSecret && <div className="mt-4 rounded-2xl border border-emerald-400/20 bg-emerald-400/10 p-4 break-all text-sm">Secret: <span className="font-mono">{newSecret}</span></div>}
            <div className="mt-5 space-y-3">
              {apiKeys.map((apiKey) => (
                <div key={apiKey.id} className="flex items-center justify-between gap-3 rounded-2xl border border-white/10 bg-white/[0.035] p-4">
                  <div>
                    <p className="font-black">{apiKey.name}</p>
                    <p className="break-all font-mono text-xs text-slate-400">{apiKey.public_key}</p>
                    <p className="mt-1 text-xs text-slate-400">{apiKey.permissions.join(', ')} · {apiKey.status}</p>
                  </div>
                  <button onClick={() => revokeApiKey(apiKey.id)} className="rounded-xl border border-rose-400/30 px-3 py-2 text-sm font-bold text-rose-200 hover:bg-rose-400/10">Revoke</button>
                </div>
              ))}
            </div>
          </section>

          <section className="rounded-[2rem] border border-white/10 bg-slate-950/70 p-6">
            <div className="mb-6 flex items-center justify-between">
              <div>
                <p className="text-sm font-bold uppercase tracking-[0.25em] text-emerald-300">Webhooks</p>
                <h2 className="mt-2 text-2xl font-black">IPN delivery</h2>
              </div>
              <Webhook className="h-8 w-8 text-emerald-300" />
            </div>
            <label className="block">
              <span className="mb-2 block text-sm text-slate-300">Callback URL</span>
              <input value={webhookForm.url} onChange={(event) => setWebhookForm({ ...webhookForm, url: event.target.value })} className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none focus:border-emerald-400" placeholder="https://yourapp.com/webhook" />
            </label>
            <div className="mt-4 grid gap-2 sm:grid-cols-2">
              {webhookEvents.map((event) => (
                <label key={event} className="flex items-center gap-2 rounded-2xl border border-white/10 bg-white/[0.035] px-3 py-2 text-sm">
                  <input type="checkbox" checked={webhookForm.events.includes(event)} onChange={(changed) => setWebhookForm({ ...webhookForm, events: changed.target.checked ? [...webhookForm.events, event] : webhookForm.events.filter((item) => item !== event) })} />
                  {event}
                </label>
              ))}
            </div>
            <button onClick={createWebhook} disabled={creatingWebhook} className="mt-5 w-full rounded-2xl bg-emerald-400 px-5 py-3 font-black text-slate-950 disabled:opacity-60">
              {creatingWebhook ? 'Creating...' : 'Save webhook'}
            </button>
            <div className="mt-5 space-y-3">
              {webhooks.map((webhook) => (
                <div key={webhook.id} className="rounded-2xl border border-white/10 bg-white/[0.035] p-4">
                  <div className="flex items-center justify-between gap-3">
                    <p className="break-all font-mono text-sm">{webhook.url}</p>
                    <button onClick={() => deleteWebhook(webhook.id)} className="rounded-xl border border-rose-400/30 px-3 py-2 text-xs font-bold text-rose-200 hover:bg-rose-400/10">Delete</button>
                  </div>
                  <p className="mt-2 text-xs text-slate-400">{webhook.events.join(', ')}</p>
                </div>
              ))}
            </div>
          </section>
        </div>

        <section className="mt-6 rounded-[2rem] border border-white/10 bg-gradient-to-br from-emerald-400/10 via-indigo-500/10 to-slate-950 p-6">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-emerald-400/20 bg-emerald-400/10 px-3 py-1 text-xs font-bold text-emerald-300">
                <ShieldCheck className="h-4 w-4" />
                Cryptomus-compatible core
              </div>
              <h2 className="mt-4 text-2xl font-black">Payment links, API keys, webhooks, exchange quotes, and status tracking are now wired into the app.</h2>
              <p className="mt-2 text-slate-300">Use the payment page for branded checkout, the API routes for automation, and webhooks for production payment confirmation.</p>
            </div>
            <div className="flex h-20 w-20 items-center justify-center rounded-3xl bg-white/10">
              <QrCode className="h-10 w-10 text-emerald-300" />
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
