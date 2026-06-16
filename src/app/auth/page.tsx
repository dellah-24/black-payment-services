'use client';

import { FormEvent, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Wallet, Lock, Mail, User, ArrowRight, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';

type AuthMode = 'signin' | 'signup';

export default function AuthPage() {
  const router = useRouter();
  const [mode, setMode] = useState<AuthMode>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    const checkSession = async () => {
      const { data } = await supabase.auth.getSession();
      if (data.session) {
        router.replace('/onboarding');
      }
    };

    checkSession();
  }, [router]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoading(true);
    setError(null);
    setMessage(null);

    try {
      const trimmedEmail = email.trim().toLowerCase();

      if (!trimmedEmail) {
        throw new Error('Enter your email address.');
      }

      if (password.length < 8) {
        throw new Error('Password must be at least 8 characters.');
      }

      if (mode === 'signup') {
        const { data, error: authError } = await supabase.auth.signUp({
          email: trimmedEmail,
          password,
          options: {
            data: {
              full_name: name.trim(),
            },
          },
        });

        if (authError) throw authError;

        if (data.user && data.session) {
          router.replace('/onboarding');
          return;
        }

        setMessage('Account created. Check your email to confirm your address.');
        return;
      }

      const { error: authError } = await supabase.auth.signInWithPassword({
        email: trimmedEmail,
        password,
      });

      if (authError) throw authError;

      router.replace('/onboarding');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Authentication failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const isSignup = mode === 'signup';

  return (
    <main className="min-h-screen bg-[#070a12] text-white">
      <div className="pointer-events-none fixed inset-0 -z-10">
        <div className="absolute left-1/2 top-0 h-[420px] w-[420px] -translate-x-1/2 rounded-full bg-indigo-500/20 blur-3xl" />
        <div className="absolute right-0 top-32 h-[360px] w-[360px] rounded-full bg-emerald-500/10 blur-3xl" />
        <div className="absolute bottom-0 left-10 h-[360px] w-[360px] rounded-full bg-blue-500/10 blur-3xl" />
      </div>

      <section className="mx-auto flex min-h-screen max-w-7xl items-center justify-center px-4 py-16">
        <div className="grid w-full max-w-5xl gap-8 lg:grid-cols-[1.05fr_0.95fr] lg:items-center">
          <div className="space-y-8">
            <div className="inline-flex items-center gap-3 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-indigo-100 shadow-2xl shadow-indigo-950/30 backdrop-blur">
              <Wallet className="h-4 w-4 text-emerald-300" />
              BlackPayments Auth
            </div>

            <div>
              <h1 className="text-4xl font-black tracking-tight text-white sm:text-6xl">
                Sign in to your crypto payment workspace
              </h1>
              <p className="mt-6 max-w-2xl text-lg leading-8 text-slate-300">
                Use your email and password to access wallet management, sending, P2P, and transaction history.
              </p>
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
              {[
                { title: 'Secure session', text: 'Supabase Auth handles sign-in state.' },
                { title: 'Wallet linked profile', text: 'Connect or create a wallet after authentication.' },
                { title: 'Protected routes', text: 'Send, P2P, Wallets, and History stay private.' },
              ].map((item) => (
                <div key={item.title} className="rounded-2xl border border-white/10 bg-white/5 p-5 backdrop-blur">
                  <CheckCircle2 className="mb-3 h-6 w-6 text-emerald-300" />
                  <p className="font-bold text-white">{item.title}</p>
                  <p className="mt-2 text-sm leading-6 text-slate-400">{item.text}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="relative overflow-hidden rounded-[2rem] border border-white/10 bg-slate-950/80 p-6 shadow-2xl shadow-indigo-950/50 backdrop-blur-xl sm:p-8">
            <div className="mb-8 flex gap-2 rounded-2xl bg-white/5 p-1">
              <button
                type="button"
                onClick={() => setMode('signin')}
                className={`flex-1 rounded-xl px-4 py-3 text-sm font-black transition ${
                  !isSignup ? 'bg-white text-slate-950' : 'text-slate-300 hover:text-white'
                }`}
              >
                Sign in
              </button>
              <button
                type="button"
                onClick={() => setMode('signup')}
                className={`flex-1 rounded-xl px-4 py-3 text-sm font-black transition ${
                  isSignup ? 'bg-white text-slate-950' : 'text-slate-300 hover:text-white'
                }`}
              >
                Register
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              {isSignup && (
                <label className="block">
                  <span className="mb-2 block text-sm font-semibold text-slate-300">Full name</span>
                  <div className="relative">
                    <User className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-500" />
                    <input
                      value={name}
                      onChange={(event) => setName(event.target.value)}
                      className="w-full rounded-2xl border border-white/10 bg-white/5 py-4 pl-12 pr-4 font-semibold text-white outline-none transition focus:border-emerald-400/70 focus:bg-white/[0.07]"
                      placeholder="Your name"
                      autoComplete="name"
                    />
                  </div>
                </label>
              )}

              <label className="block">
                <span className="mb-2 block text-sm font-semibold text-slate-300">Email</span>
                <div className="relative">
                  <Mail className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-500" />
                  <input
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    className="w-full rounded-2xl border border-white/10 bg-white/5 py-4 pl-12 pr-4 font-semibold text-white outline-none transition focus:border-emerald-400/70 focus:bg-white/[0.07]"
                    placeholder="you@example.com"
                    autoComplete="email"
                    type="email"
                    required
                  />
                </div>
              </label>

              <label className="block">
                <span className="mb-2 block text-sm font-semibold text-slate-300">Password</span>
                <div className="relative">
                  <Lock className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-500" />
                  <input
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    className="w-full rounded-2xl border border-white/10 bg-white/5 py-4 pl-12 pr-4 font-semibold text-white outline-none transition focus:border-emerald-400/70 focus:bg-white/[0.07]"
                    placeholder="••••••••"
                    autoComplete={isSignup ? 'new-password' : 'current-password'}
                    type="password"
                    required
                  />
                </div>
              </label>

              {error && (
                <div className="flex items-start gap-3 rounded-2xl border border-red-400/20 bg-red-500/10 p-4 text-sm text-red-200">
                  <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" />
                  <p>{error}</p>
                </div>
              )}

              {message && (
                <div className="flex items-start gap-3 rounded-2xl border border-emerald-400/20 bg-emerald-500/10 p-4 text-sm text-emerald-200">
                  <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0" />
                  <p>{message}</p>
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-indigo-600 to-emerald-500 px-6 py-4 font-black text-white shadow-lg shadow-emerald-500/20 transition hover:scale-[1.01] disabled:cursor-not-allowed disabled:opacity-70"
              >
                {loading ? (
                  <>
                    <Loader2 className="h-5 w-5 animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    {isSignup ? 'Create account' : 'Sign in'}
                    <ArrowRight className="h-5 w-5" />
                  </>
                )}
              </button>
            </form>

            <p className="mt-6 text-center text-sm text-slate-400">
              {isSignup ? 'Already have an account?' : "Don't have an account?"}{' '}
              <button
                type="button"
                onClick={() => setMode(isSignup ? 'signin' : 'signup')}
                className="font-black text-emerald-300 hover:text-emerald-200"
              >
                {isSignup ? 'Sign in' : 'Register'}
              </button>
            </p>
          </div>
        </div>
      </section>
    </main>
  );
}
