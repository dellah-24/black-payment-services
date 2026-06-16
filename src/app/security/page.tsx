'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Check, KeyRound, Lock, Phone, ShieldCheck, Smartphone } from 'lucide-react';

const securityItems = [
  {
    icon: ShieldCheck,
    title: 'Two-factor authentication',
    description: 'Add an extra verification step for sensitive wallet and withdrawal actions.',
    action: 'Enable 2FA',
  },
  {
    icon: KeyRound,
    title: 'Backup phrase',
    description: 'Review wallet backup settings and recovery guidance.',
    action: 'Open backup settings',
  },
  {
    icon: Smartphone,
    title: 'Trusted devices',
    description: 'Track devices used to access your BlackPayments account.',
    action: 'Manage devices',
  },
  {
    icon: Phone,
    title: 'Withdrawal alerts',
    description: 'Receive alerts for withdrawals and custody policy changes.',
    action: 'Configure alerts',
  },
];

export default function SecurityPage() {
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(false);

  return (
    <div className="min-h-screen bg-[#070a12] text-white">
      <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6 lg:px-8">
        <Link href="/profile" className="inline-flex items-center gap-2 text-sm font-semibold text-slate-300 transition hover:text-white">
          <ArrowLeft className="h-4 w-4" />
          Back to profile
        </Link>

        <section className="mt-8 rounded-[2rem] border border-white/10 bg-slate-950/70 p-6 shadow-2xl shadow-black/30 sm:p-10">
          <div className="inline-flex items-center gap-2 rounded-full border border-emerald-400/20 bg-emerald-400/10 px-3 py-1 text-xs font-bold text-emerald-300">
            <Lock className="h-4 w-4" />
            Account security
          </div>
          <h1 className="mt-6 text-4xl font-black tracking-tight text-white sm:text-5xl">Security settings</h1>
          <p className="mt-4 max-w-2xl text-slate-300">
            Manage authentication and wallet safety controls for your BlackPayments account.
          </p>

          <div className="mt-8 grid gap-4">
            {securityItems.map((item) => {
              const Icon = item.icon;
              return (
                <div key={item.title} className="flex flex-col gap-4 rounded-3xl border border-white/10 bg-white/[0.035] p-5 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex items-start gap-4">
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-400/10 text-emerald-300">
                      <Icon className="h-6 w-6" />
                    </div>
                    <div>
                      <h2 className="text-lg font-black text-white">{item.title}</h2>
                      <p className="mt-1 text-sm leading-6 text-slate-400">{item.description}</p>
                    </div>
                  </div>
                  {item.title === 'Two-factor authentication' ? (
                    <button
                      onClick={() => setTwoFactorEnabled((enabled) => !enabled)}
                      className={`inline-flex items-center gap-2 rounded-2xl px-5 py-3 font-black transition ${
                        twoFactorEnabled ? 'bg-emerald-400 text-slate-950' : 'border border-white/10 bg-white/5 text-white hover:bg-white/10'
                      }`}
                    >
                      {twoFactorEnabled ? <Check className="h-4 w-4" /> : <ShieldCheck className="h-4 w-4" />}
                      {twoFactorEnabled ? 'Enabled' : 'Enable'}
                    </button>
                  ) : (
                    <Link href="/settings" className="inline-flex items-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-5 py-3 font-black text-white transition hover:bg-white/10">
                      {item.action}
                    </Link>
                  )}
                </div>
              );
            })}
          </div>
        </section>
      </div>
    </div>
  );
}
