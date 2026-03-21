'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { ethers } from 'ethers';
import Link from 'next/link';
import { 
  TrendingUp, 
  Shield, 
  ArrowUpRight, 
  ArrowDownLeft,
  Copy,
  Check,
  DollarSign,
  Lock,
  Flame,
  Zap,
  Activity,
  Users,
  CreditCard,
  Hexagon,
  Send,
  History,
  Settings,
  LogOut,
  QrCode,
  ExternalLink,
  Fingerprint,
  Layers,
  Target,
  Star,
  Award,
  CheckCircle2,
  Circle,
  ChevronRight,
  Wallet,
  Loader2,
  Key,
  Globe,
  Cloud,
  CloudOff,
  User
} from 'lucide-react';
import { showToast } from '@/components/Toast';
import { walletStorage } from '@/lib/secureWalletStorage';
import { WalletConnectModal } from '@/components/WalletConnectModal';
import { supabase } from '@/lib/supabaseClient';
import { profileApi } from '@/lib/profileApi';

// Chain types
type ChainKey = 'tron' | 'ethereum' | 'bsc' | 'arbitrum' | 'solana';

interface ChainConfig {
  name: string;
  symbol: string;
  rpcUrls: string[]; // multiple endpoints for failover
  explorerUrl: string;
  chainId: number;
  usdtAddress: string;
}

const CHAINS: Record<ChainKey, ChainConfig> = {
  tron: {
    name: 'TRON',
    rpcUrls: ['https://api.trongrid.io'],
    explorerUrl: 'https://tronscan.org',
    symbol: 'TRX',
    chainId: 0,
    usdtAddress: 'TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t',
  },
  ethereum: {
    name: 'Ethereum',
    rpcUrls: ['https://eth.llamarpc.com', 'https://rpc.ankr.com/eth'],
    explorerUrl: 'https://etherscan.io',
    symbol: 'ETH',
    chainId: 1,
    usdtAddress: '0xdAC17F958D2ee523a2206206994597C13D831ec7',
  },
  bsc: {
    name: 'BNB Chain',
    rpcUrls: ['https://bsc-dataseed.binance.org', 'https://rpc.ankr.com/bsc'],
    explorerUrl: 'https://bscscan.com',
    symbol: 'BNB',
    chainId: 56,
    usdtAddress: '0x55d398326f99059fF775485246999027B3197955',
  },
  arbitrum: {
    name: 'Arbitrum',
    rpcUrls: ['https://arb1.arbitrum.io/rpc'],
    explorerUrl: 'https://arbiscan.io',
    symbol: 'ETH',
    chainId: 42161,
    usdtAddress: '0xFd086bC7CD5C481DCC93C85BD42c402bDe6B9614',
  },
  solana: {
    name: 'Solana',
    rpcUrls: ['https://api.mainnet-beta.solana.com'],
    explorerUrl: 'https://solscan.io',
    symbol: 'SOL',
    chainId: 0,
    usdtAddress: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
  },
};

const USDT_ABI = [
  'function balanceOf(address owner) view returns (uint256)',
  'function transfer(address to, uint256 amount) returns (boolean)',
  'function decimals() view returns (uint8)',
];

// --- Helpers and utilities ---

// In-memory cache for decrypted wallet instances (ephemeral only)
// Using ethers.BigNumber for broader wallet type compatibility
type EtherWallet = ethers.Wallet | ethers.HDNodeWallet;
const KeystoreCache = (() => {
  const map = new Map<string, { wallet: EtherWallet; expiresAt: number }>();
  const TTL = 1000 * 60 * 10; // 10 minutes

  const set = (address: string, wallet: EtherWallet, ttlMs = TTL) => {
    const expiresAt = Date.now() + ttlMs;
    map.set(address.toLowerCase(), { wallet, expiresAt });
    // schedule cleanup
    setTimeout(() => {
      const entry = map.get(address.toLowerCase());
      if (entry && entry.expiresAt <= Date.now()) map.delete(address.toLowerCase());
    }, ttlMs + 1000);
  };

  const get = (address: string) => {
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

// Raw keystore cache (prefetched encrypted JSON) - speeds up decryption without extra network roundtrip
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
  return { set, get, clear };
})();

// Provider selection cache
const providerCache = new Map<string, ethers.JsonRpcProvider>();

async function pingProvider(url: string, timeoutMs = 2000) {
  try {
    const provider = new ethers.JsonRpcProvider(url);
    const p = provider.getBlockNumber();
    const res = await Promise.race([
      p,
      new Promise((_, rej) => setTimeout(() => rej(new Error('timeout')), timeoutMs)),
    ]);
    return { provider, latency: 0 } as any; // latency measurement not implemented precisely to avoid extra calls
  } catch (e) {
    return null;
  }
}

async function getProviderForChain(chainKey: ChainKey): Promise<ethers.JsonRpcProvider> {
  const chain = CHAINS[chainKey];
  const cacheKey = chainKey;
  if (providerCache.has(cacheKey)) return providerCache.get(cacheKey)!;

  // Try each URL in order, return first responsive
  for (const url of chain.rpcUrls) {
    try {
      const ping = await pingProvider(url, 2000);
      if (ping && ping.provider) {
        providerCache.set(cacheKey, ping.provider);
        return ping.provider;
      }
    } catch (e) {
      // continue
    }
  }
  // fallback to first
  const fallback = new ethers.JsonRpcProvider(chain.rpcUrls[0]);
  providerCache.set(cacheKey, fallback);
  return fallback;
}

// Generic retry wrapper with exponential backoff + jitter
async function withRetry<T>(fn: () => Promise<T>, retries = 3, baseDelay = 200): Promise<T> {
  let attempt = 0;
  while (true) {
    try {
      return await fn();
    } catch (err) {
      attempt++;
      const isLast = attempt > retries;
      if (isLast) throw err;
      const jitter = Math.random() * 100;
      const delay = baseDelay * Math.pow(2, attempt - 1) + jitter;
      await new Promise((res) => setTimeout(res, delay));
    }
  }
}

// Simple notify wrapper to dedupe repeated messages
const recentMessages = new Map<string, number>();
function notify(type: 'success' | 'error' | 'info', message: string, dedupeMs = 3000) {
  const key = `${type}:${message}`;
  const now = Date.now();
  const last = recentMessages.get(key) || 0;
  if (now - last < dedupeMs) return; // skip duplicate
  recentMessages.set(key, now);
  showToast(type, message);
}

// Validate and normalize imported secret (mnemonic or private key)
function parseAndValidateSecret(input: string): { type: 'mnemonic' | 'privateKey'; normalized: string } {
  const trimmed = input.trim();
  // Try mnemonic first by attempting to create wallet
  try {
    const maybe = ethers.Wallet.fromPhrase(trimmed);
    if (maybe && maybe.address) {
      return { type: 'mnemonic', normalized: trimmed };
    }
  } catch (_e) {
    // not a valid mnemonic
  }

  // Normalize private key
  let pk = trimmed;
  if (!pk.startsWith('0x')) pk = '0x' + pk;
  if (!ethers.isHexString(pk)) throw new Error('Invalid private key format');
  // Basic length check for 32 bytes private key
  if (pk.length !== 66) throw new Error('Invalid private key length');
  // Try to construct wallet
  try {
    const w = new ethers.Wallet(pk);
    if (w && w.address) return { type: 'privateKey', normalized: pk };
  } catch (e) {
    throw new Error('Invalid private key');
  }

  throw new Error('Invalid secret');
}

// Centralized audit logging (non-sensitive) to Supabase
async function logEvent(eventType: string, metadata: Record<string, any> = {}) {
  try {
    // strip any potentially sensitive fields
    const sanitized = { ...metadata };
    delete sanitized.privateKey;
    delete sanitized.mnemonic;
    delete sanitized.keystore;

    const payload: any = { event_type: eventType, metadata: sanitized, created_at: new Date().toISOString() };
    // attach user id if available
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.user?.id) payload.user_id = session.user.id;

    // Fire and forget; don't block critical flows but log failures
    const { error } = await supabase.from('audit_logs').insert([payload]);
    if (error) console.warn('Audit log failed:', error);
  } catch (e) {
    console.warn('Audit logging error:', e);
  }
}

// Password strength check (basic)
function isPasswordStrong(pw: string) {
  if (!pw) return false;
  if (pw.length < 8) return false;
  // at least one letter and one number
  if (!/[a-zA-Z]/.test(pw) || !/[0-9]/.test(pw)) return false;
  return true;
}

// Last-known balance cache (non-sensitive) persisted to sessionStorage for fast perceived load
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

// --- End Helpers ---

export default function Dashboard() {
  const router = useRouter();
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');
  const [account, setAccount] = useState<string | null>(null);
  const [selectedChain, setSelectedChain] = useState<ChainKey>('ethereum');
  const [balance, setBalance] = useState<string>('0');
  const [usdtBalance, setUsdtBalance] = useState<string>('0');
  const [isLoading, setIsLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [showWalletModal, setShowWalletModal] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isAuthLoading, setIsAuthLoading] = useState(true);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [walletPassword, setWalletPassword] = useState('');
  const [pendingWalletAddress, setPendingWalletAddress] = useState<string | null>(null);

  // New states for import/encrypt modals
  const [showImportModal, setShowImportModal] = useState(false);
  const [importInput, setImportInput] = useState('');
  const [importPassword, setImportPassword] = useState('');

  const [showEncryptModal, setShowEncryptModal] = useState(false);
  const [pendingWalletInstance, setPendingWalletInstance] = useState<any>(null);
  const [encryptPassword, setEncryptPassword] = useState('');

  // Polling refs
  const pollingRef = useRef<number | null>(null);
  const pollDelayRef = useRef<number>(15000); // start at 15s

  // Helper: store keystore JSON into Supabase encrypted_wallets table
  const storeKeystoreToSupabase = async (address: string, keystore: string | null, userId?: string | null) => {
    try {
      // The encrypted_wallets table stores: wallet_address, encrypted_private_key, encrypted_mnemonic, encryption_iv
      // For now, we store the keystore as encrypted_private_key (it should already be encrypted)
      const payload: any = { 
        wallet_address: address.toLowerCase(), 
        encrypted_private_key: keystore,
        encryption_iv: 'default', // IV is already included in the keystore JSON
      };
      const { data, error } = await supabase.from('encrypted_wallets').upsert([payload], { onConflict: 'wallet_address' });
      if (error) throw error;
      // audit log
      await logEvent('WALLET_STORE', { address: address.toLowerCase() });
      return true;
    } catch (err) {
      console.error('Failed to store keystore to Supabase:', err);
      return false;
    }
  };

  const retrieveKeystoreFromSupabase = async (address: string) => {
    try {
      const { data, error } = await supabase.from('encrypted_wallets').select('encrypted_private_key').eq('wallet_address', address.toLowerCase()).single();
      if (error) throw error;
      return data?.encrypted_private_key || null;
    } catch (err) {
      console.error('Failed to retrieve keystore from Supabase:', err);
      return null;
    }
  };

  const deleteKeystoreFromSupabase = async (address: string) => {
    try {
      const { error } = await supabase.from('encrypted_wallets').delete().eq('wallet_address', address.toLowerCase());
      if (error) throw error;
      await logEvent('WALLET_DELETE', { address: address.toLowerCase() });
      return true;
    } catch (err) {
      console.error('Failed to delete keystore from Supabase:', err);
      return false;
    }
  };

  // Decrypt keystore and cache wallet instance; if keystorePrefetched provided, uses it
  const decryptAndCache = async (address: string, password: string, keystorePrefetched?: string) => {
    try {
      const keystore = keystorePrefetched || KeystoreRawCache.get(address) || await retrieveKeystoreFromSupabase(address);
      if (!keystore) throw new Error('Keystore not found');
      const wallet = await ethers.Wallet.fromEncryptedJson(keystore, password);
      KeystoreCache.set(address, wallet);
      KeystoreRawCache.set(address, keystore);
      await logEvent('WALLET_DECRYPT', { address });
      return wallet;
    } catch (e) {
      console.error('decryptAndCache failed', e);
      throw e;
    }
  };

  useEffect(() => {
    const checkAuth = async () => {
      const savedTheme = typeof window !== 'undefined' ? (localStorage.getItem('theme') as 'dark' | 'light' | null) : null;
      if (savedTheme) {
        setTheme(savedTheme);
      }

      // Check for Supabase Auth session first
      const { data: { session } } = await supabase.auth.getSession();

      if (session) {
        try {
          const profile = await profileApi.getByUserId(session.user.id);

          if (profile && profile.wallet_address) {
            const savedAccount = profile.wallet_address.toLowerCase();

            try {
              // Try to retrieve keystore from Supabase and prefetch raw keystore to speed decryption when needed
              const keystore = await retrieveKeystoreFromSupabase(savedAccount);
              if (keystore) {
                KeystoreRawCache.set(savedAccount, keystore);
                // Optimistic UI: show account immediately without decrypting
                setAccount(savedAccount);
                setIsAuthenticated(true);
                // show last-known balances if available
                const key = `${savedAccount}:${selectedChain}`;
                const last = LastKnownBalances.get(key);
                if (last) {
                  if (last.usdt) setUsdtBalance(last.usdt);
                  if (last.native) setBalance(last.native);
                }
                // schedule background balance refresh and prefetch provider
                const schedule = (cb: () => void) => {
                  if ('requestIdleCallback' in window) (window as any).requestIdleCallback(cb, { timeout: 1000 });
                  else setTimeout(cb, 500);
                };
                schedule(async () => {
                  try {
                    await getProviderForChain(selectedChain);
                    fetchBalances(savedAccount, selectedChain);
                  } catch (e) { /* ignore */ }
                });
              } else {
                // No keystore in cloud - prompt user to provide password to decrypt existing remote storage
                setPendingWalletAddress(savedAccount);
                setShowPasswordModal(true);
              }
            } catch (e) {
              setPendingWalletAddress(savedAccount);
              setShowPasswordModal(true);
            }
          } else {
            console.log('User has auth but no profile - can create wallet from home');
            // User has auth but no wallet/profile - show them the create wallet option
            setIsAuthenticated(true);
          }
        } catch (e) {
          console.warn('Profile fetch error, allowing access:', e);
          setIsAuthenticated(true);
        }
      } else {
        // Not authenticated - redirect to auth
        router.push('/auth');
      }

      setIsAuthLoading(false);
    };

    checkAuth();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Polling logic: refresh balances periodically while tab visible
  useEffect(() => {
    let visibilityHandler: any;
    const startPolling = () => {
      if (pollingRef.current) return;
      pollingRef.current = window.setInterval(async () => {
        if (!account) return;
        try {
          await fetchBalances(account, selectedChain);
          // reset delay
          pollDelayRef.current = 15000;
        } catch (e) {
          // increase delay
          pollDelayRef.current = Math.min(120000, pollDelayRef.current * 2);
          if (pollingRef.current) {
            clearInterval(pollingRef.current);
            pollingRef.current = window.setInterval(async () => {
              if (account) await fetchBalances(account, selectedChain);
            }, pollDelayRef.current);
          }
        }
      }, pollDelayRef.current);
    };

    const stopPolling = () => {
      if (pollingRef.current) { clearInterval(pollingRef.current); pollingRef.current = null; }
    };

    if (account) startPolling();

    if (typeof document !== 'undefined') {
      visibilityHandler = () => {
        if (document.hidden) stopPolling(); else if (account) startPolling();
      };
      document.addEventListener('visibilitychange', visibilityHandler);
    }

    return () => {
      stopPolling();
      if (typeof document !== 'undefined' && visibilityHandler) document.removeEventListener('visibilitychange', visibilityHandler);
    };
  }, [account, selectedChain]);

  // Fetch balances when account or selectedChain changes (initial immediate fetch)
  useEffect(() => {
    if (account) {
      // Use last-known cache to show instant value (already applied in checkAuth), then refresh
      fetchBalances(account, selectedChain);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [account, selectedChain]);

  const connectWallet = async () => {
    setShowWalletModal(true);
  };

  const createNewWallet = async () => {
    setIsLoading(true);
    try {
      const wallet = ethers.Wallet.createRandom();
      // Store pending wallet and show encrypt modal to capture password
      setPendingWalletInstance(wallet);
      setShowEncryptModal(true);
    } catch (err) {
      console.error('Failed to create wallet', err);
      notify('error', 'Failed to create wallet. Please try again.');
      setIsLoading(false);
    }
  };

  const handleEncryptAndStore = async () => {
    if (!pendingWalletInstance || !encryptPassword) return;
    if (!isPasswordStrong(encryptPassword)) {
      notify('error', 'Password must be at least 8 chars and include letters and numbers');
      return;
    }
    setIsLoading(true);
    try {
      // Use wallet.encrypt with moderate scrypt params to balance security and UI responsiveness in browser
      // ethers v6 expects: encrypt(password, progressCallback?, options?)
      const keystore = await pendingWalletInstance.encrypt(encryptPassword, undefined, { scrypt: { N: 32768, r: 8, p: 1 } });

      // Attach to supabase (if logged in)
      const { data: { session } } = await supabase.auth.getSession();
      const userId = session?.user?.id || null;

      const stored = await storeKeystoreToSupabase(pendingWalletInstance.address, keystore, userId);
      if (stored) {
        const walletAddress = pendingWalletInstance.address.toLowerCase();
        
        // Link profile to user ID for cross-device access
        if (userId) {
          try {
            // Create or update profile with user ID
            await supabase.from('profiles').upsert({
              id: userId,
              wallet_address: walletAddress,
              kyc_level: 0,
              kyc_status: 'none'
            }, { onConflict: 'id' });
          } catch (e) {
            console.warn('Failed to link profile to user:', e);
          }
        }
        
        setAccount(walletAddress);
        walletStorage.setCurrentAccount(walletAddress);
        setIsAuthenticated(true);
        notify('success', 'Wallet created and encrypted. Save your password securely.');
        setShowEncryptModal(false);
        setPendingWalletInstance(null);
        setEncryptPassword('');
        setBalance('0');
        setUsdtBalance('0');
        // persist last-known balances
        const key = `${pendingWalletInstance.address.toLowerCase()}:${selectedChain}`;
        LastKnownBalances.set(key, { usdt: '0', native: '0', ts: Date.now() });
        await logEvent('WALLET_CREATE', { address: pendingWalletInstance.address.toLowerCase() });
      } else {
        notify('error', 'Failed to save wallet to cloud. Please try again.');
      }
    } catch (err) {
      console.error('Failed to encrypt and store wallet:', err);
      notify('error', 'Failed to encrypt or store wallet.');
    } finally {
      setIsLoading(false);
    }
  };

  const importWallet = async () => {
    // Open secure import modal rather than browser prompt
    setImportInput('');
    setImportPassword('');
    setShowImportModal(true);
  };

  const handleImportSubmit = async () => {
    if (!importInput || !importPassword) {
      notify('error', 'Input and a password to encrypt are required');
      return;
    }
    if (!isPasswordStrong(importPassword)) {
      notify('error', 'Password must be at least 8 chars and include letters and numbers');
      return;
    }
    setIsLoading(true);
    try {
      const parsed = parseAndValidateSecret(importInput);
      let wallet: any;

      if (parsed.type === 'mnemonic') {
        wallet = ethers.Wallet.fromPhrase(parsed.normalized);
      } else {
        wallet = new ethers.Wallet(parsed.normalized);
      }

      // Encrypt keystore with provided password (moderate scrypt to avoid blocking too long)
      const keystore = await wallet.encrypt(importPassword, { scrypt: { N: 32768, r: 8, p: 1 } });
      const { data: { session } } = await supabase.auth.getSession();
      const userId = session?.user?.id || null;

      const stored = await storeKeystoreToSupabase(wallet.address, keystore, userId);
      if (stored) {
        setAccount(wallet.address.toLowerCase());
        setIsAuthenticated(true);
        notify('success', 'Wallet imported, encrypted, and saved to cloud!');
        setBalance('0');
        setUsdtBalance('0');
        setShowImportModal(false);
        fetchBalances(wallet.address.toLowerCase(), selectedChain);
        const key = `${wallet.address.toLowerCase()}:${selectedChain}`;
        LastKnownBalances.set(key, { usdt: '0', native: '0', ts: Date.now() });
        KeystoreRawCache.set(wallet.address.toLowerCase(), keystore);
        await logEvent('WALLET_IMPORT', { address: wallet.address.toLowerCase(), type: parsed.type });
      } else {
        notify('error', 'Failed to save wallet to cloud.');
      }
    } catch (err: any) {
      console.error('Failed to import wallet:', err);
      notify('error', err?.message || 'Invalid private key or seed phrase. Please check and try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const decimalsCache = new Map<string, number>();

  const fetchBalances = async (address: string, chainKey: ChainKey) => {
    if (chainKey === 'tron' || chainKey === 'solana') {
      setBalance('0');
      setUsdtBalance('0');
      const key = `${address.toLowerCase()}:${chainKey}`;
      LastKnownBalances.set(key, { usdt: '0', native: '0', ts: Date.now() });
      return;
    }

    try {
      const chain = CHAINS[chainKey];
      const provider = await getProviderForChain(chainKey);

      const usdtContract = new ethers.Contract(chain.usdtAddress, USDT_ABI, provider);

      // Parallelize balance and decimals and use caches
      const decimalsKey = `${chainKey}:${chain.usdtAddress}`;
      const decimalsPromise = decimalsCache.has(decimalsKey)
        ? Promise.resolve(decimalsCache.get(decimalsKey)!)
        : withRetry(() => usdtContract.decimals(), 2, 200).then((d: any) => { const num = Number(d); decimalsCache.set(decimalsKey, num); return num; });

      const [usdtBal, decimals] = await Promise.all([
        withRetry(() => usdtContract.balanceOf(address), 2, 200),
        decimalsPromise,
      ]);

      const formattedUsdt = ethers.formatUnits(usdtBal, decimals);
      setUsdtBalance(formattedUsdt);

      // Optionally get native balance as well (fast)
      try {
        const native = await provider.getBalance(address);
        const formattedNative = ethers.formatUnits(native, 18);
        setBalance(formattedNative);
      } catch (e) {
        console.warn('Failed to fetch native balance', e);
      }

      // persist last-known balances for perceived speed on reload
      const key = `${address.toLowerCase()}:${chainKey}`;
      LastKnownBalances.set(key, { usdt: formattedUsdt, native: balance, ts: Date.now() });

    } catch (err) {
      console.error('Error fetching balances:', err);
      // Reset balances on error to avoid stale display
      setUsdtBalance('0');
      setBalance('0');
      notify('error', 'Unable to fetch balances');
    }
  };

  const copyAddress = () => {
    if (account) {
      navigator.clipboard.writeText(account);
      setCopied(true);
      notify('success', 'Address copied to clipboard!');
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const disconnectWallet = async () => {
    if (confirm('Are you sure you want to sign out?')) {
      if (account) {
        await deleteKeystoreFromSupabase(account);
        KeystoreCache.clear(account);
        KeystoreRawCache.clear(account);
      }
      // Sign out Supabase session as well
      try {
        await supabase.auth.signOut();
      } catch (e) {
        console.warn('Failed to sign out from Supabase:', e);
      }
      await logEvent('USER_SIGNOUT', { address: account });
      window.location.href = '/auth';
    }
  };

  const chain = CHAINS[selectedChain];

  // Features for the welcome screen
  const features = [
    { icon: Shield, title: 'Secure Escrow', desc: 'Your funds are protected with smart contracts', color: 'green' },
    { icon: Zap, title: 'Low Fees', desc: 'TRC-20 network for minimal transaction costs', color: 'yellow' },
    { icon: Users, title: 'P2P Trading', desc: 'Trade directly with verified users worldwide', color: 'blue' },
    { icon: Layers, title: 'Split Custody', desc: 'Hot & cold wallet security system', color: 'purple' },
  ];

  // Color class map to avoid dynamic tailwind strings
  const colorClassMap: any = {
    green: { bg: 'bg-green-500/20', text: 'text-green-400' },
    yellow: { bg: 'bg-yellow-500/20', text: 'text-yellow-400' },
    blue: { bg: 'bg-blue-500/20', text: 'text-blue-400' },
    purple: { bg: 'bg-purple-500/20', text: 'text-purple-400' },
    orange: { bg: 'bg-orange-500/20', text: 'text-orange-40' },
    indigo: { bg: 'bg-indigo-500/20', text: 'text-indigo-400' },
  };

  // Quick actions with icons
  const quickActions = [
    { icon: Send, label: 'Send USDT', href: '/send', color: 'blue', desc: 'Transfer to any address' },
    { icon: ArrowDownLeft, label: 'Receive', href: '/wallets', color: 'green', desc: 'Get your deposit address' },
    { icon: DollarSign, label: 'P2P Trade', href: '/p2p', color: 'orange', desc: 'Buy or sell USDT' },
    { icon: History, label: 'History', href: '/history', color: 'purple', desc: 'View all transactions' },
    { icon: User, label: 'Profile', href: '/profile', color: 'indigo', desc: 'Manage your account' },
  ];

  // Network options
  const networks = [
    { id: 'tron', name: 'TRON', symbol: 'TRX', emoji: '🔴', desc: 'Best for low fees', recommended: true },
    { id: 'bsc', name: 'BNB Chain', symbol: 'BNB', emoji: '🟡', desc: 'Fast & cheap' },
    { id: 'ethereum', name: 'Ethereum', symbol: 'ETH', emoji: '🔵', desc: 'Most popular' },
  ];

  // Show loading while checking authentication
  if (isAuthLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-900 to-indigo-950 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 rounded-full bg-indigo-600/20 flex items-center justify-center mx-auto mb-4 animate-pulse">
            <Wallet className="h-8 w-8 text-indigo-400" />
          </div>
          <p className="text-gray-400">Loading...</p>
        </div>
      </div>
    );
  }

  // Redirect if not authenticated
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-900 to-indigo-950 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 rounded-full bg-indigo-600/20 flex items-center justify-center mx-auto mb-4 animate-pulse">
            <Loader2 className="h-8 w-8 text-indigo-400 animate-spin" />
          </div>
          <p className="text-gray-400">Redirecting to sign in...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-900 to-indigo-950">
      {/* Password Modal (decrypt existing keystore) */}
      {showPasswordModal && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50">
          <div className="bg-gray-800 rounded-xl p-6 w-full max-w-md mx-4">
            <h2 className="text-xl font-bold text-white mb-4">Enter Wallet Password</h2>
            <p className="text-gray-400 mb-4">Enter your password to decrypt your wallet from the cloud.</p>
            <input
              type="password"
              value={walletPassword}
              onChange={(e) => setWalletPassword(e.target.value)}
              placeholder="Wallet password"
              className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 mb-4"
              onKeyDown={(e) => e.key === 'Enter' && (async () => { try { await decryptAndCache(pendingWalletAddress!, walletPassword); setAccount(pendingWalletAddress); setIsAuthenticated(true); setShowPasswordModal(false); fetchBalances(pendingWalletAddress!, selectedChain); notify('success', 'Wallet decrypted successfully'); } catch (err) { notify('error', 'Failed to decrypt wallet'); } })()}
            />
            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowPasswordModal(false);
                  setWalletPassword('');
                  router.push('/auth');
                }}
                className="flex-1 px-4 py-3 bg-gray-600 text-white rounded-lg hover:bg-gray-500 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleImportSubmit}
                disabled={!walletPassword}
                className="flex-1 px-4 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Decrypt Wallet
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Import Modal (secure) */}
      {showImportModal && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50">
          <div className="bg-gray-800 rounded-xl p-6 w-full max-w-md mx-4">
            <h2 className="text-xl font-bold text-white mb-4">Import Wallet</h2>
            <p className="text-gray-400 mb-2">Paste your private key (0x...) or 12/24-word seed phrase. Provide a password to encrypt the keystore for cloud storage.</p>
            <textarea
              value={importInput}
              onChange={(e) => setImportInput(e.target.value)}
              placeholder="Private key or seed phrase"
              className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 mb-3"
              rows={4}
            />
            <input
              type="password"
              value={importPassword}
              onChange={(e) => setImportPassword(e.target.value)}
              placeholder="Encryption password"
              className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 mb-4"
            />
            <div className="flex gap-3">
              <button
                onClick={() => { setShowImportModal(false); setImportInput(''); setImportPassword(''); }}
                className="flex-1 px-4 py-3 bg-gray-600 text-white rounded-lg hover:bg-gray-500 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleImportSubmit}
                disabled={!importInput || !importPassword}
                className="flex-1 px-4 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Import & Encrypt
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Encrypt Modal for newly generated wallet */}
      {showEncryptModal && pendingWalletInstance && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50">
          <div className="bg-gray-800 rounded-xl p-6 w-full max-w-md mx-4">
            <h2 className="text-xl font-bold text-white mb-4">Secure your new wallet</h2>
            <p className="text-gray-400 mb-2">Set a password to encrypt your keystore before saving it to the cloud. You will need this password to decrypt your wallet later.</p>
            <div className="mb-3">
              <p className="text-sm text-gray-300 mb-1">Address</p>
              <code className="text-sm text-white font-mono">{pendingWalletInstance.address}</code>
            </div>
            <input
              type="password"
              value={encryptPassword}
              onChange={(e) => setEncryptPassword(e.target.value)}
              placeholder="Encryption password"
              className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 mb-4"
            />
            <div className="flex gap-3">
              <button
                onClick={() => { setShowEncryptModal(false); setPendingWalletInstance(null); setEncryptPassword(''); }}
                className="flex-1 px-4 py-3 bg-gray-600 text-white rounded-lg hover:bg-gray-500 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleEncryptAndStore}
                disabled={!encryptPassword}
                className="flex-1 px-4 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Encrypt & Save
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main content */}
      <main className="max-w-6xl mx-auto px-4 py-8">
        {!account ? (
          /* Welcome Screen with Visual Elements */
          <div className="space-y-12">
            {/* Top Bar with Profile Link */}
            <div className="flex justify-end">
              <Link href="/profile" className="p-2 rounded-lg bg-white/10 hover:bg-white/20 text-white" title="Profile">
                <User className="h-5 w-5" />
              </Link>
            </div>

            {/* Hero Section */}
            <div className="text-center space-y-6">
              <div className="relative inline-block">
                <div className="absolute inset-0 bg-indigo-500 blur-3xl opacity-30 animate-pulse" />
                <div className="relative w-28 h-28 rounded-3xl bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 flex items-center justify-center shadow-2xl shadow-indigo-500/30">
                  <Wallet className="h-14 w-14 text-white" />
                </div>
              </div>
              
              <div>
                <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">
                  Welcome to <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-purple-400">BlackPayments</span>
                </h1>
                <p className="text-xl text-gray-400 max-w-2xl mx-auto">
                  Your secure USDT P2P wallet with split-custody protection
                </p>
              </div>

              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <button
                  onClick={createNewWallet}
                  disabled={isLoading}
                  className="px-8 py-4 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-2xl font-bold text-lg hover:scale-105 transition-all shadow-lg shadow-indigo-500/30 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                  aria-label="Create a new wallet"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="h-5 w-5 animate-spin" />
                      Creating...
                    </>
                  ) : (
                    <>
                      <Star className="h-5 w-5" /> Create Wallet
                    </>
                  )}
                </button>
                <button
                  onClick={importWallet}
                  className="px-8 py-4 bg-gray-800 text-white rounded-2xl font-bold text-lg hover:bg-gray-700 transition-colors border border-gray-700 flex items-center justify-center gap-2"
                >
                  <Key className="h-5 w-5" /> Import Wallet
                </button>
              </div>
            </div>

            {/* Features Grid with Icons */}
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
              {features.map((feature) => (
                <div key={feature.title} className="p-6 rounded-2xl bg-gray-900/50 border border-gray-800 hover:border-gray-700 transition-all hover:-translate-y-1">
                  <div className={`${colorClassMap[feature.color].bg} w-14 h-14 rounded-2xl flex items-center justify-center mb-4`}>
                    <feature.icon className={`${colorClassMap[feature.color].text} h-7 w-7`} />
                  </div>
                  <h3 className="text-lg font-bold text-white mb-2">{feature.title}</h3>
                  <p className="text-gray-400">{feature.desc}</p>
                </div>
              ))}
            </div>

            {/* Why Choose Us */}
            <div className="rounded-3xl bg-gradient-to-br from-indigo-900/50 via-purple-900/50 to-gray-900 p-8 md:p-12">
              <div className="text-center mb-8">
                <h2 className="text-3xl font-bold text-white mb-2">Why Choose BlackPayments?</h2>
                <p className="text-gray-400">The most secure way to trade USDT P2P</p>
              </div>
              
              <div className="grid md:grid-cols-3 gap-6">
                {[
                  { icon: Award, title: 'Best Rates', desc: 'Direct P2P trades with competitive prices', stat: '98%' },
                  { icon: Target, title: 'Fast Trading', desc: 'Instant escrow release after payment', stat: '< 5min' },
                  { icon: Shield, title: 'Secure Funds', desc: 'Split custody protects your assets', stat: '100%' },
                ].map((item) => (
                  <div key={item.title} className="text-center p-6">
                    <div className="w-16 h-16 rounded-2xl bg-white/10 flex items-center justify-center mx-auto mb-4">
                      <item.icon className="h-8 w-8 text-indigo-400" />
                    </div>
                    <p className="text-3xl font-bold text-white mb-1">{item.stat}</p>
                    <p className="text-lg text-gray-300 mb-1">{item.title}</p>
                    <p className="text-sm text-gray-500">{item.desc}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : (
          /* Dashboard with Wallet */
          <div className="space-y-6">
            {/* Main Wallet Card - Visual & Easy to Read */}
            <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-indigo-600 via-purple-600 to-indigo-800 p-6 md:p-8">
              {/* Background Decorations */}
              <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2" />
              <div className="absolute bottom-0 left-0 w-48 h-48 bg-white/10 rounded-full translate-y-1/2 -translate-x-1/2" />
              <div className="absolute top-1/2 left-1/2 w-32 h-32 bg-white/5 rounded-full -translate-x-1/2 -translate-y-1/2" />
              
              <div className="relative">
                {/* Wallet Header */}
                <div className="flex items-center justify-between mb-8">
                  <div className="flex items-center gap-4">
                    <div className="w-16 h-16 rounded-2xl bg-white/20 backdrop-blur flex items-center justify-center">
                      <Wallet className="h-8 w-8 text-white" />
                    </div>
                    <div>
                      <h2 className="text-2xl font-bold text-white">My Wallet</h2>
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 rounded-full text-xs bg-green-500/30 text-green-300 border border-green-500/30 flex items-center gap-1">
                          <Circle className="h-2 w-2 fill-current" /> Active
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Link href="/profile" className="p-2 rounded-lg bg-white/10 hover:bg-white/20 text-white" title="Profile">
                      <User className="h-5 w-5" />
                    </Link>
                    <button onClick={disconnectWallet} className="p-2 rounded-lg bg-white/10 hover:bg-white/20 text-white" title="Sign Out">
                      <LogOut className="h-5 w-5" />
                    </button>
                  </div>
                </div>

                {/* Balance Display - Large & Clear */}
                <div className="mb-8">
                  <p className="text-indigo-200 text-sm mb-1">Total Balance (USDT)</p>
                  <p className="text-4xl md:text-5xl lg:text-6xl font-bold text-white">${parseFloat(usdtBalance).toFixed(2)}</p>
                  <p className="text-indigo-200 mt-1">{parseFloat(balance).toFixed(6)} {chain.symbol}</p>
                </div>

                {/* Address - Easy to Copy */}
                <div className="p-4 rounded-xl bg-black/20 backdrop-blur mb-6">
                  <p className="text-xs text-indigo-300 mb-1">Wallet Address</p>
                  <div className="flex items-center justify-between">
                    <code className="text-sm text-white font-mono">{account.slice(0, 16)}...{account.slice(-12)}</code>
                    <button onClick={copyAddress} className="p-2 rounded-lg hover:bg-white/10">
                      {copied ? <Check className="h-4 w-4 text-green-400" /> : <Copy className="h-4 w-4 text-indigo-200" />}
                    </button>
                  </div>
                </div>

                {/* Quick Action Buttons - Big & Clear */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {quickActions.map((action) => (
                    <Link key={action.label} href={action.href}>
                      <div className="p-4 rounded-xl bg-white/10 hover:bg-white/20 backdrop-blur transition-colors text-center">
                        <action.icon className="h-6 w-6 mx-auto mb-2 text-white" />
                        <p className="text-sm font-medium text-white">{action.label}</p>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { label: 'Total Volume', value: '$12,450', icon: TrendingUp, color: 'green' },
                { label: 'Escrow Rate', value: '100%', icon: Shield, color: 'blue' },
                { label: 'Network Fee', value: '$0.001', icon: Zap, color: 'orange' },
                { label: 'P2P Trades', value: '24', icon: Activity, color: 'purple' },
              ].map((stat) => (
                <div key={stat.label} className="p-4 rounded-2xl bg-gray-900/50 border border-gray-800">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-gray-500 text-sm">{stat.label}</span>
                    <stat.icon className={`${colorClassMap[stat.color].text} h-5 w-5`} />
                  </div>
                  <p className="text-2xl font-bold text-white">{stat.value}</p>
                </div>
              ))}
            </div>

            {/* Networks */}
            <div className="rounded-2xl bg-gray-900/50 border border-gray-800 p-6">
              <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                <Globe className="h-5 w-5 text-indigo-400" /> Supported Networks
              </h3>
              <div className="grid md:grid-cols-3 gap-4">
                {networks.map((net) => (
                  <div key={net.id} className="p-4 rounded-xl bg-gray-800/50 border border-gray-700 flex items-center gap-3">
                    <span className="text-3xl">{net.emoji}</span>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <p className="font-semibold text-white">{net.name}</p>
                        {net.recommended && (
                          <span className="px-2 py-0.5 rounded-full text-xs bg-green-500/20 text-green-400">Best</span>
                        )}
                      </div>
                      <p className="text-xs text-gray-500">{net.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Wallet Connection Modal */}
      <WalletConnectModal
        isOpen={showWalletModal}
        onClose={() => setShowWalletModal(false)}
        onConnect={(account) => {
          setAccount(account);
          fetchBalances(account, selectedChain);
        }}
      />
    </div>
  );
}

// Test helpers for unit tests (in-memory mocks)
// Note: Cannot export arbitrary items from page.tsx in Next.js strict mode
// Import from src/test-local.ts for testing purposes instead
if (typeof window !== 'undefined') {
  // @ts-expect-error - attaching test helpers to window for testing
  window.__testHelpers = {
    KeystoreCache,
    KeystoreRawCache,
    parseAndValidateSecret,
    withRetry,
    logEvent,
    notify,
  };
}
