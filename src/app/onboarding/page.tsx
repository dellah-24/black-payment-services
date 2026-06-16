'use client';

import { FormEvent, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ethers } from 'ethers';
import { Wallet, KeyRound, ExternalLink, Loader2, CheckCircle2, AlertCircle, ArrowRight, ShieldCheck } from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';
import { profileApi } from '@/lib/profileApi';
import { walletStorage } from '@/lib/secureWalletStorage';
import { showToast } from '@/components/Toast';

type OnboardingMode = 'create' | 'import' | 'external';

export default function OnboardingPage() {
  const router = useRouter();
  const [mode, setMode] = useState<OnboardingMode>('create');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [seedPhrase, setSeedPhrase] = useState<string | null>(null);

  const [importInput, setImportInput] = useState('');
  const [walletPassword, setWalletPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  useEffect(() => {
    const checkReady = async () => {
      const { data: sessionData } = await supabase.auth.getSession();
      const session = sessionData.session;

      if (!session) {
        router.replace('/auth');
        return;
      }

      const profile = await profileApi.getByUserId(session.user.id);
      if (profile?.wallet_address) {
        router.replace('/');
      }
    };

    checkReady();
  }, [router]);

  const isLocalWalletMode = mode === 'create' || mode === 'import';
  const passwordRequired = isLocalWalletMode;
  const passwordsMatch = !walletPassword || walletPassword === confirmPassword;

  const linkProfileToWallet = async (walletAddress: string) => {
    const { data: sessionData } = await supabase.auth.getSession();
    const session = sessionData.session;

    if (!session?.user?.id) {
      throw new Error('Authentication session expired. Please sign in again.');
    }

    await profileApi.createForAuthUser(session.user.id, walletAddress, {
      kyc_level: 0,
      kyc_status: 'none',
    });
  };

  const createWallet = async () => {
    setLoading(true);
    setError(null);
    setSuccess(null);
    setSeedPhrase(null);

    try {
      if (!passwordRequired || walletPassword.length < 12) {
        throw new Error('Create-wallet encryption password must be at least 12 characters.');
      }

      if (walletPassword !== confirmPassword) {
        throw new Error('Wallet passwords do not match.');
      }

      const wallet = ethers.Wallet.createRandom();
      const mnemonicPhrase = wallet.mnemonic?.phrase || '';

      await linkProfileToWallet(wallet.address);
      const stored = await walletStorage.storeWallet(wallet.address, wallet.privateKey, mnemonicPhrase, walletPassword);

      if (!stored) {
        throw new Error('Wallet was created but could not be stored securely.');
      }

      setSeedPhrase(mnemonicPhrase);
      setSuccess('Wallet created and linked to your profile. Save the recovery phrase before continuing.');
      showToast('success', 'Wallet created successfully');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create wallet.');
      showToast('error', 'Failed to create wallet');
    } finally {
      setLoading(false);
    }
  };

  const importWallet = async () => {
    setLoading(true);
    setError(null);
    setSuccess(null);
    setSeedPhrase(null);

    try {
      if (!passwordRequired || walletPassword.length < 12) {
        throw new Error('Import encryption password must be at least 12 characters.');
      }

      if (walletPassword !== confirmPassword) {
        throw new Error('Wallet passwords do not match.');
      }

      if (!importInput.trim()) {
        throw new Error('Enter a private key or 12/24-word seed phrase.');
      }

      const input = importInput.trim();
      const words = input.split(/\s+/);
      const wallet = words.length === 12 || words.length === 24
        ? ethers.Wallet.fromPhrase(input)
        : new ethers.Wallet(input.startsWith('0x') ? input : `0x${input}`);

      await linkProfileToWallet(wallet.address);
      const stored = await walletStorage.storeWallet(
        wallet.address,
        wallet.privateKey,
        words.length === 12 || words.length === 24 ? input : undefined,
        walletPassword
      );

      if (!stored) {
        throw new Error('Wallet was imported but could not be stored securely.');
      }

      setSuccess('Wallet imported and linked to your profile.');
      showToast('success', 'Wallet imported successfully');
      router.replace('/');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to import wallet.');
      showToast('error', 'Failed to import wallet');
    } finally {
      setLoading(false);
    }
  };

  const connectExternalWallet = async () => {
    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      if (typeof window === 'undefined' || typeof (window as any).ethereum === 'undefined') {
        throw new Error('MetaMask or another injected wallet is not available.');
      }

      const provider = new ethers.BrowserProvider((window as any).ethereum);
      await provider.send('eth_requestAccounts', []);
      const accounts = await provider.listAccounts();

      if (!accounts.length) {
        throw new Error('No wallet account was returned.');
      }

      const address = accounts[0].address;
      localStorage.setItem('bp_account', address);
      localStorage.setItem('bp_connection_type', 'metamask');

      await linkProfileToWallet(address);
      setSuccess('External wallet connected and linked to your profile.');
      showToast('success', 'External wallet connected');
      router.replace('/');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to connect external wallet.');
      showToast('error', 'Failed to connect external wallet');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (mode === 'create') {
      void createWallet();
    }

    if (mode === 'import') {
      void importWallet();
    }
  };

  return (
    <main className="min-h-screen bg-[#070a12] text-white">
      <div className="pointer-events-none fixed inset-0 -z-10">
        <div className="absolute left-1/2 top-0 h-[420px] w-[420px] -translate-x-1/2 rounded-full bg-indigo-500/20 blur-3xl" />
        <div className="absolute right-0 top-32 h-[360px] w-[360px] rounded-full bg-emerald-500/10 blur-3xl" />
        <div className="absolute bottom-0 left-10 h-[360px] w-[360px] rounded-full bg-blue-500/10 blur-3xl" />
      </div>

      <section className="mx-auto flex min-h-screen max-w-7xl items-center justify-center px-4 py-16">
        <div className="grid w-full max-w-6xl gap-8 lg:grid-cols-[0.9fr_1.1fr] lg:items-center">
          <div className="space-y-8">
            <div className="inline-flex items-center gap-3 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-indigo-100 shadow-2xl shadow-indigo-950/30 backdrop-blur">
              <ShieldCheck className="h-4 w-4 text-emerald-300" />
              Wallet onboarding
            </div>

            <div>
              <h1 className="text-4xl font-black tracking-tight text-white sm:text-6xl">
                Connect your first wallet
              </h1>
              <p className="mt-6 max-w-2xl text-lg leading-8 text-slate-300">
                Your account is authenticated. Choose how you want to link a wallet before accessing Send, P2P, Wallets, and History.
              </p>
            </div>

            <div className="grid gap-4">
              {[
                { title: 'Create new wallet', text: 'Generate a new wallet and encrypt it with your password.' },
                { title: 'Import existing wallet', text: 'Use a private key or seed phrase you already control.' },
                { title: 'Connect external wallet', text: 'Link MetaMask or another injected browser wallet.' },
              ].map((item, index) => (
                <div key={item.title} className="flex gap-4 rounded-2xl border border-white/10 bg-white/5 p-5 backdrop-blur">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-400/10 font-black text-emerald-300">
                    {index + 1}
                  </div>
                  <div>
                    <p className="font-bold text-white">{item.title}</p>
                    <p className="mt-1 text-sm leading-6 text-slate-400">{item.text}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="relative overflow-hidden rounded-[2rem] border border-white/10 bg-slate-950/80 p-6 shadow-2xl shadow-indigo-950/50 backdrop-blur-xl sm:p-8">
            <div className="mb-8 grid grid-cols-3 gap-2 rounded-2xl bg-white/5 p-1">
              <button
                type="button"
                onClick={() => setMode('create')}
                className={`rounded-xl px-3 py-3 text-sm font-black transition ${
                  mode === 'create' ? 'bg-white text-slate-950' : 'text-slate-300 hover:text-white'
                }`}
              >
                Create
              </button>
              <button
                type="button"
                onClick={() => setMode('import')}
                className={`rounded-xl px-3 py-3 text-sm font-black transition ${
                  mode === 'import' ? 'bg-white text-slate-950' : 'text-slate-300 hover:text-white'
                }`}
              >
                Import
              </button>
              <button
                type="button"
                onClick={() => setMode('external')}
                className={`rounded-xl px-3 py-3 text-sm font-black transition ${
                  mode === 'external' ? 'bg-white text-slate-950' : 'text-slate-300 hover:text-white'
                }`}
              >
                Connect
              </button>
            </div>

            {mode === 'external' ? (
              <div className="space-y-5">
                <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
                  <ExternalLink className="mb-3 h-8 w-8 text-emerald-300" />
                  <h2 className="text-xl font-black text-white">Connect external wallet</h2>
                  <p className="mt-2 text-sm leading-6 text-slate-400">
                    Link an injected browser wallet such as MetaMask. This stores only the wallet address in your profile.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => void connectExternalWallet()}
                  disabled={loading}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-indigo-600 to-emerald-500 px-6 py-4 font-black text-white shadow-lg shadow-emerald-500/20 transition hover:scale-[1.01] disabled:cursor-not-allowed disabled:opacity-70"
                >
                  {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Wallet className="h-5 w-5" />}
                  {loading ? 'Connecting...' : 'Connect MetaMask'}
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-5">
                {mode === 'create' && (
                  <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
                    <KeyRound className="mb-3 h-8 w-8 text-emerald-300" />
                    <h2 className="text-xl font-black text-white">Create new wallet</h2>
                    <p className="mt-2 text-sm leading-6 text-slate-400">
                      A new wallet will be generated, encrypted locally in your browser, and linked to your profile.
                    </p>
                  </div>
                )}

                {mode === 'import' && (
                  <label className="block">
                    <span className="mb-2 block text-sm font-semibold text-slate-300">Private key or seed phrase</span>
                    <textarea
                      value={importInput}
                      onChange={(event) => setImportInput(event.target.value)}
                      className="min-h-32 w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 font-mono text-sm text-white outline-none transition focus:border-emerald-400/70 focus:bg-white/[0.07]"
                      placeholder="Enter private key or 12/24-word seed phrase"
                      required
                    />
                  </label>
                )}

                {passwordRequired && (
                  <>
                    <label className="block">
                      <span className="mb-2 block text-sm font-semibold text-slate-300">Wallet encryption password</span>
                      <input
                        value={walletPassword}
                        onChange={(event) => setWalletPassword(event.target.value)}
                        className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-4 font-semibold text-white outline-none transition focus:border-emerald-400/70 focus:bg-white/[0.07]"
                        placeholder="At least 12 characters"
                        type="password"
                        required
                      />
                    </label>

                    <label className="block">
                      <span className="mb-2 block text-sm font-semibold text-slate-300">Confirm password</span>
                      <input
                        value={confirmPassword}
                        onChange={(event) => setConfirmPassword(event.target.value)}
                        className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-4 font-semibold text-white outline-none transition focus:border-emerald-400/70 focus:bg-white/[0.07]"
                        placeholder="Repeat wallet password"
                        type="password"
                        required
                      />
                    </label>

                    {!passwordsMatch && (
                      <p className="text-sm text-red-300">Passwords do not match.</p>
                    )}
                  </>
                )}

                {error && (
                  <div className="flex items-start gap-3 rounded-2xl border border-red-400/20 bg-red-500/10 p-4 text-sm text-red-200">
                    <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" />
                    <p>{error}</p>
                  </div>
                )}

                {success && (
                  <div className="flex items-start gap-3 rounded-2xl border border-emerald-400/20 bg-emerald-500/10 p-4 text-sm text-emerald-200">
                    <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0" />
                    <p>{success}</p>
                  </div>
                )}

                {seedPhrase && (
                  <div className="rounded-2xl border border-amber-400/20 bg-amber-400/10 p-4">
                    <p className="mb-2 text-sm font-black text-amber-200">Recovery phrase</p>
                    <p className="rounded-xl bg-black/30 p-3 font-mono text-sm text-amber-100">
                      {seedPhrase}
                    </p>
                    <p className="mt-2 text-xs leading-5 text-amber-200/80">
                      Store this phrase offline. It is the only way to recover this wallet if you lose access.
                    </p>
                    <button
                      type="button"
                      onClick={() => router.replace('/')}
                      className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-white px-4 py-3 font-black text-slate-950 transition hover:bg-slate-200"
                    >
                      Continue to dashboard <ArrowRight className="h-4 w-4" />
                    </button>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading || (passwordRequired && !passwordsMatch) || !!seedPhrase}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-indigo-600 to-emerald-500 px-6 py-4 font-black text-white shadow-lg shadow-emerald-500/20 transition hover:scale-[1.01] disabled:cursor-not-allowed disabled:opacity-70"
                >
                  {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : <ArrowRight className="h-5 w-5" />}
                  {loading ? 'Processing...' : mode === 'create' ? 'Create and link wallet' : 'Import and link wallet'}
                </button>
              </form>
            )}
          </div>
        </div>
      </section>
    </main>
  );
}
