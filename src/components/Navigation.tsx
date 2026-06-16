'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Code2, Coins, CreditCard, Home, Lock, Menu, ShieldCheck, Wallet, X } from 'lucide-react';

const navItems = [
  { href: '/', label: 'Home', icon: Home },
  { href: '/payments', label: 'Payments', icon: CreditCard },
  { href: '/send', label: 'Send', icon: Wallet },
  { href: '/p2p', label: 'P2P', icon: Coins },
  { href: '/wallets', label: 'Wallets', icon: ShieldCheck },
  { href: '/history', label: 'History', icon: CreditCard },
  { href: '/auth', label: 'Sign in', icon: Lock },
];

export function Navigation() {
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <nav className="fixed inset-x-0 top-0 z-50 border-b border-white/10 bg-[#070a12]/80 backdrop-blur-xl">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
        <Link href="/" className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-400 to-indigo-500 shadow-lg shadow-emerald-500/20">
            <Wallet className="h-6 w-6 text-white" />
          </div>
          <div>
            <p className="text-base font-black tracking-tight text-white">BlackPayments</p>
            <p className="text-xs text-slate-400">Crypto gateway</p>
          </div>
        </Link>

        <div className="hidden items-center gap-1 md:flex">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-2 rounded-full px-4 py-2 text-sm font-bold transition ${
                  active
                    ? 'bg-white text-slate-950'
                    : 'text-slate-300 hover:bg-white/10 hover:text-white'
                }`}
              >
                <Icon className="h-4 w-4" />
                {item.label}
              </Link>
            );
          })}
          <Link
            href="/api-docs"
            className="ml-2 flex items-center gap-2 rounded-full border border-emerald-300/30 bg-emerald-400/10 px-4 py-2 text-sm font-black text-emerald-300 transition hover:bg-emerald-400/20"
          >
            <Code2 className="h-4 w-4" />
            API
          </Link>
        </div>

        <button
          onClick={() => setMobileMenuOpen((open) => !open)}
          className="rounded-2xl border border-white/10 p-2.5 text-white transition hover:bg-white/10 md:hidden"
          aria-label="Toggle navigation"
        >
          {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      {mobileMenuOpen && (
        <div className="border-t border-white/10 bg-[#070a12]/95 px-4 py-4 md:hidden">
          <div className="grid gap-2">
            {navItems.map((item) => {
              const Icon = item.icon;
              const active = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-bold transition ${
                    active
                      ? 'bg-white text-slate-950'
                      : 'text-slate-300 hover:bg-white/10 hover:text-white'
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  {item.label}
                </Link>
              );
            })}
            <Link
              href="/api-docs"
              onClick={() => setMobileMenuOpen(false)}
              className="flex items-center gap-3 rounded-2xl bg-emerald-400/10 px-4 py-3 text-sm font-black text-emerald-300"
            >
              <Code2 className="h-4 w-4" />
              API
            </Link>
          </div>
        </div>
      )}
    </nav>
  );
}
