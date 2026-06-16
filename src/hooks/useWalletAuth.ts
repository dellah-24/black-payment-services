'use client';

import { useState, useEffect, useCallback } from 'react';
import { ethers, HDNodeWallet } from 'ethers';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import { profileApi } from '@/lib/profileApi';
import { useWalletStore } from '@/stores/walletStore';
import { logger } from '@/lib/logger';
import { showToast } from '@/components/Toast';
import { logEvent } from '@/lib/audit';
import { ChainKey } from '@/config/chains';

// In-memory cache for decrypted wallet instances (ephemeral only)
type EtherWallet = ethers.Wallet | ethers.HDNodeWallet;
const KeystoreCache = (() => {
  const map = new Map<string, { wallet: EtherWallet; expiresAt: number }>();
  const TTL = 1000 * 60 * 10; // 10 minutes

  const set = (address: string, wallet: EtherWallet, ttlMs = TTL) => {
    const expiresAt = Date.now() + ttlMs;
    map.set(address.toLowerCase(), { wallet, expiresAt });
    setTimeout(() => {
      const entry = map.get(address.toLowerCase());
      if (entry && entry.expiresAt <= Date.now()) map.delete(address.toLowerCase());
    }, ttlMs + 1000);
  };

  const get = (address: string): (ethers.Wallet | HDNodeWallet) | null => {
    const entry = map.get(address.toLowerCase());
    if (!entry) return null;
    if (Date.now() > entry.expiresAt) {
      map.delete(address.toLowerCase());
      return null;
    }
    return entry.wallet;
  };

  const clear = (address?: string) => {
    if (address) map.delete(address.toLowerCase());
    else map.clear();
  };

  return { set, get, clear };
})();

// Raw keystore cache (prefetched encrypted JSON)
const KeystoreRawCache = (() => {
  const map = new Map<string, { keystore: string; expiresAt: number }>();
  const TTL = 1000 * 60 * 30; // 30 minutes
  const set = (address: string, keystore: string, ttlMs = TTL) => {
    map.set(address.toLowerCase(), { keystore, expiresAt: Date.now() + ttlMs });
    setTimeout(() => {
      const entry = map.get(address.toLowerCase());
      if (entry && entry.expiresAt <= Date.now()) map.delete(address.toLowerCase());
    }, ttlMs + 1000);
  };
  const get = (address: string) => {
    const entry = map.get(address.toLowerCase());
    if (!entry) return null;
    if (Date.now() > entry.expiresAt) { map.delete(address.toLowerCase()); return null; }
    return entry.keystore;
  };
  const clear = (address?: string) => { if (address) map.delete(address.toLowerCase()); else map.clear(); };
  return { get, set, clear };
})();

// Last-known balance cache
const LastKnownBalances = (() => {
  const key = 'lastKnownBalances_v1';
  const load = () => {
    try {
      const raw = typeof window !== 'undefined' ? sessionStorage.getItem(key) : null;
      return raw ? JSON.parse(raw) : {};
    } catch (e) { return {}; }
  };
  const save = (obj: Record<string, any>) => {
    try { sessionStorage.setItem(key, JSON.stringify(obj)); } catch (e) {}
  };
  let store = load();
  const get = (k: string) => store[k];
  const set = (k: string, v: any) => { store[k] = v; save(store); };
  const clear = () => { store = {}; save(store); };
  return { get, set, clear };
})();

// Password strength check
function isPasswordStrong(pw: string): boolean {
  if (!pw) return false;
  if (pw.length < 12) return false;
  if (!/[a-z]/.test(pw)) return false;
  if (!/[A-Z]/.test(pw)) return false;
  if (!/[0-9]/.test(pw)) return false;
  if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(pw)) return false;
  return true;
}

/**
 * Hook to manage wallet authentication and lifecycle
 */
export function useWalletAuth() {
  const router = useRouter();
  const {
    account,
    selectedChain,
    setAccount,
    setIsAuthenticated,
    setIsAuthLoading,
    setShowPasswordModal,
    setShowImportModal,
    setShowEncryptModal,
    setBalance,
    setUsdtBalance,
  } = useWalletStore();

  const [pendingWalletAddress, setPendingWalletAddress] = useState<string | null>(null);
  const [pendingWalletInstance, setPendingWalletInstance] = useState<any>(null);
  const [walletPassword, setWalletPassword] = useState('');
  const [importInput, setImportInput] = useState('');
  const [importPassword, setImportPassword] = useState('');
  const [encryptPassword, setEncryptPassword] = useState('');

  // Store keystore to Supabase
  const storeKeystoreToSupabase = useCallback(async (address: string, keystore: string | null, userId?: string | null) => {
    try {
      const payload: any = {
        wallet_address: address.toLowerCase(),
        encrypted_private_key: keystore,
        encryption_iv: 'default',
      };
      const { error } = await supabase.from('encrypted_wallets').upsert([payload], { onConflict: 'wallet_address' });
      if (error) throw error;
      await logEvent('WALLET_STORE', { address: address.toLowerCase() });
      return true;
    } catch (err) {
      logger.error('Failed to store keystore to Supabase:', err as Error);
      return false;
    }
  }, []);

  const retrieveKeystoreFromSupabase = useCallback(async (address: string) => {
    try {
      const { data, error } = await supabase.from('encrypted_wallets')
        .select('encrypted_private_key')
        .eq('wallet_address', address.toLowerCase())
        .single();
      if (error) throw error;
      return data?.encrypted_private_key || null;
    } catch (err) {
      logger.error('Failed to retrieve keystore from Supabase:', err as Error);
      return null;
    }
  }, []);

  const deleteKeystoreFromSupabase = useCallback(async (address: string) => {
    try {
      const { error } = await supabase.from('encrypted_wallets').delete().eq('wallet_address', address.toLowerCase());
      if (error) throw error;
      await logEvent('WALLET_DELETE', { address: address.toLowerCase() });
      return true;
    } catch (err) {
      logger.error('Failed to delete keystore from Supabase:', err as Error);
      return false;
    }
  }, []);

  // Decrypt keystore and cache wallet instance
  const decryptAndCache = useCallback(async (address: string, password: string, keystorePrefetched?: string) => {
    try {
      const keystore = keystorePrefetched || KeystoreRawCache.get(address) || await retrieveKeystoreFromSupabase(address);
      if (!keystore) throw new Error('Keystore not found');
      const wallet = await ethers.Wallet.fromEncryptedJson(keystore, password);
      KeystoreCache.set(address, wallet);
      KeystoreRawCache.set(address, keystore);
      await logEvent('WALLET_DECRYPT', { address });
      return wallet;
    } catch (e) {
      logger.error('decryptAndCache failed', e as Error);
      throw e;
    }
  }, [retrieveKeystoreFromSupabase]);

  // Check authentication on mount
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const savedTheme = typeof window !== 'undefined' ? (localStorage.getItem('theme') as 'dark' | 'light' | null) : null;
        if (savedTheme) {
          // Theme is already in store, just apply
        }

        const { data: { session } } = await supabase.auth.getSession();

        if (session) {
          try {
            const profile = await profileApi.getByUserId(session.user.id);

            if (profile && profile.wallet_address) {
              const savedAccount = profile.wallet_address.toLowerCase();

              try {
                const keystore = await retrieveKeystoreFromSupabase(savedAccount);
                if (keystore) {
                  KeystoreRawCache.set(savedAccount, keystore);
                  setAccount(savedAccount);
                  if (typeof window !== 'undefined') {
                    localStorage.setItem('account', savedAccount);
                  }
                  setIsAuthenticated(true);
                  // Show last-known balances if available
                  const key = `${savedAccount}:${selectedChain}`;
                  const last = LastKnownBalances.get(key);
                  if (last) {
                    if (last.usdt) setUsdtBalance(last.usdt);
                    if (last.native) setBalance(last.native);
                  }
                } else {
                  logger.info('User has profile but no keystore - redirect to auth');
                  setIsAuthLoading(false);
                  router.push('/');
                  return;
                }
              } catch (e) {
                setIsAuthLoading(false);
                router.push('/');
                return;
              }
            } else {
              logger.info('User has auth but no profile - redirect to auth');
              setIsAuthLoading(false);
              router.push('/');
              return;
            }
          } catch (e) {
            logger.error('Profile fetch error:', e as Error);
            setIsAuthLoading(false);
            router.push('/');
            return;
          }
        } else {
          logger.info('No Supabase session - redirecting to auth');
          setIsAuthLoading(false);
          router.push('/');
          return;
        }

        setIsAuthLoading(false);
      } catch (e) {
        logger.error('checkAuth failed', e as Error);
        setIsAuthLoading(false);
        router.push('/');
      }
    };

    checkAuth();
  }, [retrieveKeystoreFromSupabase, setAccount, setIsAuthenticated, setIsAuthLoading, setBalance, setUsdtBalance, selectedChain, router]);

  // Create new wallet
  const createNewWallet = useCallback(async () => {
    try {
      const wallet = ethers.Wallet.createRandom();
      setPendingWalletInstance(wallet as any);
      setShowEncryptModal(true);
    } catch (err) {
      logger.error('Failed to create wallet', err as Error);
      showToast('error', 'Failed to create wallet. Please try again.');
    }
  }, [setShowEncryptModal]);

  // Handle encrypt and store after wallet creation
  const handleEncryptAndStore = useCallback(async () => {
    if (!pendingWalletInstance || !encryptPassword) return;
    if (!isPasswordStrong(encryptPassword)) {
      showToast('error', 'Password must be at least 12 chars with letters, numbers, and special characters');
      return;
    }

    try {
      const keystore = await pendingWalletInstance.encrypt(encryptPassword, { scrypt: { N: 32768, r: 8, p: 1 } });

      const { data: { session } } = await supabase.auth.getSession();
      const userId = session?.user?.id || null;

      const stored = await storeKeystoreToSupabase(pendingWalletInstance.address, keystore, userId);
      if (stored) {
        const walletAddress = pendingWalletInstance.address.toLowerCase();

        if (userId) {
          try {
            await supabase.from('profiles').upsert({
              id: userId,
              wallet_address: walletAddress,
              kyc_level: 0,
              kyc_status: 'none'
            }, { onConflict: 'id' });
          } catch (e) {
            logger.warn('Failed to link profile to user', e as Error);
          }
        }

        setAccount(walletAddress);
        if (typeof window !== 'undefined') {
          localStorage.setItem('account', walletAddress.toLowerCase());
        }
        setIsAuthenticated(true);
        showToast('success', 'Wallet created and encrypted. Save your password securely.');
        setShowEncryptModal(false);
        setPendingWalletInstance(null);
        setEncryptPassword('');
        setBalance('0');
        setUsdtBalance('0');
        const key = `${pendingWalletInstance.address.toLowerCase()}:${selectedChain}`;
        LastKnownBalances.set(key, { usdt: '0', native: '0', ts: Date.now() });
        await logEvent('WALLET_CREATE', { address: pendingWalletInstance.address.toLowerCase() });
      } else {
        showToast('error', 'Failed to save wallet to cloud. Please try again.');
      }
    } catch (err) {
      logger.error('Failed to encrypt and store wallet', err as Error);
      showToast('error', 'Failed to encrypt or store wallet.');
    }
  }, [pendingWalletInstance, encryptPassword, storeKeystoreToSupabase, setAccount, setIsAuthenticated, setShowEncryptModal, setBalance, setUsdtBalance, selectedChain]);

  // Open import modal
  const openImportModal = useCallback(() => {
    setImportInput('');
    setImportPassword('');
    setShowImportModal(true);
  }, [setShowImportModal]);

  // Handle import submission
  const handleImportSubmit = useCallback(async () => {
    if (!importInput || !importPassword) {
      showToast('error', 'Input and a password to encrypt are required');
      return;
    }
    if (!isPasswordStrong(importPassword)) {
      showToast('error', 'Password must be at least 12 chars with letters, numbers, and special characters');
      return;
    }

    try {
      // Sanitize and validate
      const sanitized = importInput.trim().replace(/[<>]/g, '');
      let wallet: any;

      // Try mnemonic first
      try {
        wallet = ethers.Wallet.fromPhrase(sanitized);
      } catch (_e) {
        // Try private key
        let pk = sanitized;
        if (!pk.startsWith('0x')) pk = '0x' + pk;
        if (!ethers.isHexString(pk)) throw new Error('Invalid private key format');
        if (pk.length !== 66) throw new Error('Invalid private key length');
        wallet = new ethers.Wallet(pk);
      }

      const keystore = await wallet.encrypt(importPassword, undefined, { scrypt: { N: 32768, r: 8, p: 1 } }) as string;
      const { data: { session } } = await supabase.auth.getSession();
      const userId = session?.user?.id || null;

      const stored = await storeKeystoreToSupabase(wallet.address, keystore, userId);
      if (stored) {
        setAccount(wallet.address.toLowerCase());
        if (typeof window !== 'undefined') {
          localStorage.setItem('account', wallet.address.toLowerCase());
        }
        setIsAuthenticated(true);
        showToast('success', 'Wallet imported, encrypted, and saved to cloud!');
        setBalance('0');
        setUsdtBalance('0');
        setShowImportModal(false);
        const key = `${wallet.address.toLowerCase()}:${selectedChain}`;
        LastKnownBalances.set(key, { usdt: '0', native: '0', ts: Date.now() });
        KeystoreRawCache.set(wallet.address.toLowerCase(), keystore);
        await logEvent('WALLET_IMPORT', { address: wallet.address.toLowerCase() });
      } else {
        showToast('error', 'Failed to save wallet to cloud.');
      }
    } catch (err: any) {
      logger.error('Failed to import wallet', err as Error);
      showToast('error', err?.message || 'Invalid private key or seed phrase. Please check and try again.');
    }
  }, [importInput, importPassword, storeKeystoreToSupabase, setAccount, setIsAuthenticated, setBalance, setUsdtBalance, setShowImportModal, selectedChain]);

  // Decrypt existing wallet (from password modal)
  const decryptWallet = useCallback(async (address: string, password: string) => {
    try {
      const wallet = await decryptAndCache(address, password);
      setAccount(address);
      setIsAuthenticated(true);
      setShowPasswordModal(false);
      setPendingWalletAddress(null);
      setWalletPassword('');
      showToast('success', 'Wallet decrypted successfully');
      return wallet;
    } catch (err) {
      showToast('error', 'Failed to decrypt wallet');
      throw err;
    }
  }, [decryptAndCache, setAccount, setIsAuthenticated, setShowPasswordModal]);

  // Disconnect wallet
  const disconnectWallet = useCallback(async () => {
    if (account) {
      await deleteKeystoreFromSupabase(account);
      KeystoreCache.clear(account);
      KeystoreRawCache.clear(account);
    }
    try {
      await supabase.auth.signOut();
    } catch (e) {
      logger.warn('Failed to sign out from Supabase', e as Error);
    }
    await logEvent('USER_SIGNOUT', { address: account });
    window.location.href = '/';
  }, [account, deleteKeystoreFromSupabase]);

  return {
    // State
    pendingWalletAddress,
    setPendingWalletAddress,
    pendingWalletInstance,
    setPendingWalletInstance,
    walletPassword,
    setWalletPassword,
    importInput,
    setImportInput,
    importPassword,
    setImportPassword,
    encryptPassword,
    setEncryptPassword,

    // Actions
    createNewWallet,
    handleEncryptAndStore,
    openImportModal,
    handleImportSubmit,
    decryptWallet,
    disconnectWallet,

    // Utilities
    KeystoreCache,
    KeystoreRawCache,
    isPasswordStrong,
  };
}
