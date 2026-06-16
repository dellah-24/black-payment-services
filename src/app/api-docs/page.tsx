import Link from 'next/link';
import { ArrowRight, CreditCard, Globe, ShieldCheck, Terminal, Webhook } from 'lucide-react';

const endpoints = [
  {
    method: 'POST',
    path: '/api/payments/requests',
    title: 'Create invoice',
    description: 'Create a Cryptomus-style payment invoice with amount, currency, network, lifetime, order id, and callback URL.',
  },
  {
    method: 'GET',
    path: '/api/payments/requests',
    title: 'List invoices',
    description: 'List merchant invoices with optional status filtering.',
  },
  {
    method: 'GET',
    path: '/api/payments/[id]/status',
    title: 'Invoice status',
    description: 'Read the public status of an invoice for checkout pages and polling.',
  },
  {
    method: 'POST',
    path: '/api/payments/[id]',
    title: 'Update invoice',
    description: 'Cancel, expire, refund, or mark an invoice as paid for merchant workflows.',
  },
  {
    method: 'POST',
    path: '/api/payments/webhooks',
    title: 'Create webhook',
    description: 'Register callback URLs for payment lifecycle events with signed payloads.',
  },
  {
    method: 'POST',
    path: '/api/merchant/api-keys',
    title: 'Create API key',
    description: 'Generate a merchant API key for external checkout automation.',
  },
  {
    method: 'POST',
    path: '/api/exchange',
    title: 'Exchange quote',
    description: 'Quote crypto-to-crypto conversion rates with fee and network fee fields.',
  },
  {
    method: 'GET',
    path: '/api/custodial/addresses',
    title: 'Custody addresses',
    description: 'List or create user deposit addresses for supported custodial chains.',
  },
  {
    method: 'POST',
    path: '/api/custodial/withdraw',
    title: 'Custodial withdrawal',
    description: 'Submit a guarded withdrawal through the server-side custody layer.',
  },
  {
    method: 'GET',
    path: '/api/custodial/history',
    title: 'Transaction history',
    description: 'Read deposits and withdrawals for the authenticated user.',
  },
];

export default function ApiDocsPage() {
  return (
    <div className="min-h-screen bg-[#070a12] text-white">
      <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6 lg:px-8">
        <Link href="/" className="inline-flex items-center gap-2 text-sm font-semibold text-slate-300 transition hover:text-white">
          ← Back to dashboard
        </Link>

        <section className="mt-10 rounded-[2rem] border border-white/10 bg-slate-950/70 p-6 shadow-2xl shadow-black/30 sm:p-10">
          <div className="inline-flex items-center gap-2 rounded-full border border-emerald-400/20 bg-emerald-400/10 px-3 py-1 text-xs font-bold text-emerald-300">
            <Terminal className="h-4 w-4" />
            BlackPayments API
          </div>
          <h1 className="mt-6 text-4xl font-black tracking-tight text-white sm:text-6xl">API documentation</h1>
          <p className="mt-5 max-w-3xl text-lg leading-8 text-slate-300">
            Build checkout, custodial wallet, and payment automation flows directly on BlackPayments without third-party invoice providers.
          </p>

          <div className="mt-10 grid gap-4 md:grid-cols-2">
            {endpoints.map((endpoint) => (
              <div key={endpoint.path} className="rounded-3xl border border-white/10 bg-white/[0.035] p-5 transition hover:border-emerald-400/30 hover:bg-white/[0.06]">
                <div className="flex items-center gap-3">
                  <span className="rounded-full bg-emerald-400/10 px-3 py-1 text-xs font-black text-emerald-300">{endpoint.method}</span>
                  <code className="text-sm text-white">{endpoint.path}</code>
                </div>
                <h2 className="mt-4 text-lg font-black text-white">{endpoint.title}</h2>
                <p className="mt-2 text-sm leading-6 text-slate-400">{endpoint.description}</p>
              </div>
            ))}
          </div>

          <div className="mt-10 grid gap-4 md:grid-cols-3">
            <div className="rounded-2xl border border-white/10 bg-white/[0.035] p-5">
              <CreditCard className="h-6 w-6 text-emerald-300" />
              <h2 className="mt-4 font-black text-white">Checkout</h2>
              <p className="mt-2 text-sm text-slate-400">Create payment references and render branded payment pages.</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/[0.035] p-5">
              <Globe className="h-6 w-6 text-emerald-300" />
              <h2 className="mt-4 font-black text-white">Custody</h2>
              <p className="mt-2 text-sm text-slate-400">Manage TRON-first deposit addresses and withdrawals.</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/[0.035] p-5">
              <Webhook className="h-6 w-6 text-emerald-300" />
              <h2 className="mt-4 font-black text-white">Webhooks</h2>
              <p className="mt-2 text-sm text-slate-400">Confirm deposits, withdrawals, and payment lifecycle events.</p>
            </div>
          </div>

          <div className="mt-10 rounded-3xl border border-emerald-400/20 bg-emerald-400/10 p-5">
            <ShieldCheck className="h-6 w-6 text-emerald-300" />
            <h2 className="mt-3 text-xl font-black text-white">Production note</h2>
            <p className="mt-2 text-sm leading-6 text-slate-300">
              Custodial withdrawals require HSM/KMS-backed signing, Redis-backed idempotency, PostgreSQL ledger records, and policy checks before broadcast.
            </p>
          </div>

          <div className="mt-10 flex flex-col gap-3 sm:flex-row">
            <Link href="/send" className="inline-flex items-center justify-center gap-2 rounded-2xl bg-white px-6 py-4 font-black text-slate-950 transition hover:bg-slate-200">
              Open Send <ArrowRight className="h-5 w-5" />
            </Link>
            <Link href="/wallets" className="inline-flex items-center justify-center rounded-2xl border border-white/10 bg-white/5 px-6 py-4 font-black text-white transition hover:bg-white/10">
              View wallets
            </Link>
          </div>
        </section>
      </div>
    </div>
  );
}
