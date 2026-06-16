import { TronWeb } from 'tronweb';
import { isLocalhostUrl, isProduction } from '@/lib/env';
import { logger } from '@/lib/logger';
import { WalletChain } from '@/wallet/types';
import { deriveHDKey, getBIP44Path, normalizeMnemonic, validateMnemonic } from '@/lib/hdWallet';
import { assertCustodyReady, getCustodyKeyManagerMode, getRuntimeEnv } from '@/lib/custodyPolicy';
import { getTronEnvUrls, writeEVMUSDTTransfer, writeTronUSDTTransfer } from '@/lib/blockchainNodes';

export interface CustodialDeriveParams {
  userId: string;
  chain: WalletChain | 'tron' | 'ethereum' | 'bsc' | 'polygon' | 'arbitrum' | 'optimism' | 'avalanche' | 'celo' | 'linea' | 'base';
  accountIndex: number;
  purpose?: 'deposit' | 'withdrawal' | 'hot' | 'cold';
}

export interface DerivedCustodialKey {
  userId: string;
  chain: WalletChain;
  accountIndex: number;
  purpose: 'deposit' | 'withdrawal' | 'hot' | 'cold';
  path: string;
  address: string;
  privateKey?: string;
  publicKey?: string;
  source: 'local-hd' | 'hsm' | 'http-hsm';
}

export interface SignEVMParams {
  chain: WalletChain;
  userId: string;
  accountIndex: number;
  to: string;
  value?: bigint;
  data?: string;
  nonce?: number;
  gasLimit?: bigint;
  maxFeePerGas?: bigint;
  maxPriorityFeePerGas?: bigint;
}

export interface SignTronParams {
  userId: string;
  accountIndex: number;
  to: string;
  amount: bigint;
  feeLimit?: number;
}

export interface HSMClient {
  deriveKey(params: CustodialDeriveParams): Promise<Omit<DerivedCustodialKey, 'source'>>;
  signEVMTransaction(params: SignEVMParams): Promise<string>;
  signTronTransaction(params: SignTronParams): Promise<string>;
  signAndBroadcastEVMTransaction?(params: SignEVMParams): Promise<string>;
  signAndBroadcastTronTransaction?(params: SignTronParams): Promise<string>;
}

export interface CustodialKeyManager {
  readonly source: 'local-hd' | 'hsm' | 'http-hsm';
  deriveKey(params: CustodialDeriveParams): Promise<DerivedCustodialKey>;
  signEVMTransaction(params: SignEVMParams): Promise<string>;
  signTronTransaction(params: SignTronParams): Promise<string>;
  signAndBroadcastEVMTransaction(params: SignEVMParams): Promise<string>;
  signAndBroadcastTronTransaction(params: SignTronParams): Promise<string>;
}

export class LocalHDCustodialKeyManager implements CustodialKeyManager {
  readonly source = 'local-hd' as const;

  constructor(private readonly masterSeed: string) {
    const normalized = normalizeMnemonic(masterSeed);
    if (!validateMnemonic(normalized)) {
      throw new Error('Invalid BIP-39 master seed');
    }
  }

  async deriveKey(params: CustodialDeriveParams): Promise<DerivedCustodialKey> {
    const purpose = params.purpose ?? 'deposit';
    const accountIndex = getAccountIndex(params.accountIndex, purpose);
    const derived = deriveHDKey(this.masterSeed, params.chain, accountIndex);
    const path = getBIP44Path({ chain: params.chain, accountIndex, change: purposeToChange(purpose) });

    return {
      userId: params.userId,
      chain: toWalletChain(params.chain),
      accountIndex,
      purpose,
      path,
      address: derived.address,
      privateKey: derived.privateKey,
      publicKey: derived.publicKey,
      source: this.source,
    };
  }

  async signEVMTransaction(_params: SignEVMParams): Promise<string> {
    throw new Error('Local HD manager only signs through signAndBroadcastEVMTransaction.');
  }

  async signTronTransaction(_params: SignTronParams): Promise<string> {
    throw new Error('Local HD manager only signs through signAndBroadcastTronTransaction.');
  }

  async signAndBroadcastEVMTransaction(params: SignEVMParams): Promise<string> {
    const derived = await this.deriveKey({
      userId: params.userId,
      chain: params.chain,
      accountIndex: params.accountIndex,
      purpose: 'withdrawal',
    });

    if (!derived.privateKey) {
      throw new Error('Unable to derive withdrawal private key for EVM broadcast');
    }

    return writeEVMUSDTTransfer({
      chain: params.chain,
      privateKey: derived.privateKey,
      to: params.to,
      amount: params.value ?? 0n,
    });
  }

  async signAndBroadcastTronTransaction(params: SignTronParams): Promise<string> {
    const derived = await this.deriveKey({
      userId: params.userId,
      chain: 'tron',
      accountIndex: params.accountIndex,
      purpose: 'withdrawal',
    });

    if (!derived.privateKey) {
      throw new Error('Unable to derive withdrawal private key for TRON broadcast');
    }

    return writeTronUSDTTransfer({
      privateKey: derived.privateKey,
      to: params.to,
      amount: params.amount,
      feeLimit: params.feeLimit,
    });
  }
}

export class HttpHSMCustodialKeyManager implements CustodialKeyManager {
  readonly source = 'http-hsm' as const;

  constructor(private readonly baseUrl: string) {
    this.baseUrl = baseUrl.replace(/\/$/, '');
  }

  async deriveKey(params: CustodialDeriveParams): Promise<DerivedCustodialKey> {
    const response = await this.request<Omit<DerivedCustodialKey, 'source'>>('/derive-key', params);
    return { ...response, source: this.source };
  }

  async signEVMTransaction(params: SignEVMParams): Promise<string> {
    return this.request<{ signature: string }>('/sign-evm-transaction', params).then((result) => result.signature);
  }

  async signTronTransaction(params: SignTronParams): Promise<string> {
    return this.request<{ signature: string }>('/sign-tron-transaction', params).then((result) => result.signature);
  }

  async signAndBroadcastEVMTransaction(params: SignEVMParams): Promise<string> {
    type BroadcastResult = { txHash?: string; hash?: string; transactionHash?: string; tx_hash?: string; signature?: string };
    return this.request<BroadcastResult>('/sign-and-broadcast-evm-transaction', params)
      .then((result) => result.txHash || result.hash || result.transactionHash || result.tx_hash || result.signature || '');
  }

  async signAndBroadcastTronTransaction(params: SignTronParams): Promise<string> {
    type BroadcastResult = { txHash?: string; hash?: string; transactionHash?: string; tx_hash?: string; signature?: string };
    return this.request<BroadcastResult>('/sign-and-broadcast-tron-transaction', params)
      .then((result) => result.txHash || result.hash || result.transactionHash || result.tx_hash || result.signature || '');
  }

  private async request<T>(path: string, body: unknown): Promise<T> {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    const token = getRuntimeEnv('CUSTODIAL_HSM_TOKEN');
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }

    const response = await fetch(`${this.baseUrl}${path}`, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
    });

    const payload = (await response.json().catch(() => ({}))) as { error?: string; message?: string } & T;
    if (!response.ok) {
      throw new Error(payload.error || payload.message || `HSM request failed: ${path}`);
    }

    return payload as T;
  }
}

export class AdapterCustodialKeyManager implements CustodialKeyManager {
  constructor(private readonly client: HSMClient, readonly source: 'hsm' | 'http-hsm') {}

  async deriveKey(params: CustodialDeriveParams): Promise<DerivedCustodialKey> {
    const derived = await this.client.deriveKey(params);
    return { ...derived, source: this.source };
  }

  async signEVMTransaction(params: SignEVMParams): Promise<string> {
    return this.client.signEVMTransaction(params);
  }

  async signTronTransaction(params: SignTronParams): Promise<string> {
    return this.client.signTronTransaction(params);
  }

  async signAndBroadcastEVMTransaction(params: SignEVMParams): Promise<string> {
    if (!this.client.signAndBroadcastEVMTransaction) {
      throw new Error('Configured HSM client does not implement signAndBroadcastEVMTransaction');
    }
    return this.client.signAndBroadcastEVMTransaction(params);
  }

  async signAndBroadcastTronTransaction(params: SignTronParams): Promise<string> {
    if (!this.client.signAndBroadcastTronTransaction) {
      throw new Error('Configured HSM client does not implement signAndBroadcastTronTransaction');
    }
    return this.client.signAndBroadcastTronTransaction(params);
  }
}

export function createCustodialKeyManager(options: {
  mode?: 'local-hd' | 'hsm' | 'http-hsm';
  masterSeed?: string;
  hsmBaseUrl?: string;
  client?: HSMClient;
  allowLocalHdInProduction?: boolean;
}): CustodialKeyManager {
  const mode = options.mode ?? getCustodyKeyManagerMode();
  assertCustodyReady({ allowLocalHdInProduction: options.allowLocalHdInProduction });

  if (mode === 'local-hd') {
    if (isProduction() && !options.allowLocalHdInProduction) {
      throw new Error('Local HD custody is disabled in production. Configure CUSTODIAL_HSM_BASE_URL or an HSM client.');
    }
    if (!options.masterSeed) {
      throw new Error('masterSeed is required for local HD key management. Production should use HSM/KMS instead.');
    }
    return new LocalHDCustodialKeyManager(options.masterSeed);
  }

  if (mode === 'http-hsm') {
    if (!options.hsmBaseUrl) {
      throw new Error('hsmBaseUrl or CUSTODIAL_HSM_BASE_URL is required for HTTP HSM key management.');
    }
    if (isProduction() && isLocalhostUrl(options.hsmBaseUrl)) {
      throw new Error('CUSTODIAL_HSM_BASE_URL must point to a production HTTPS HSM endpoint.');
    }
    return new HttpHSMCustodialKeyManager(options.hsmBaseUrl);
  }

  if (!options.client) {
    throw new Error('HSM client is required. For HTTP HSM, pass hsmBaseUrl or set CUSTODIAL_HSM_BASE_URL.');
  }

  return new AdapterCustodialKeyManager(options.client, 'hsm');
}

export function createCustodialKeyManagerFromEnv(options: { allowLocalHdInProduction?: boolean } = {}): CustodialKeyManager {
  return createCustodialKeyManager({
    mode: getCustodyKeyManagerMode(),
    masterSeed: getRuntimeEnv('CUSTODIAL_MASTER_SEED'),
    hsmBaseUrl: getRuntimeEnv('CUSTODIAL_HSM_BASE_URL'),
    ...options,
  });
}

export async function deriveCustodialDepositAddress(params: {
  keyManager: CustodialKeyManager;
  userId: string;
  chain: CustodialDeriveParams['chain'];
  accountIndex?: number;
}): Promise<{ address: string; path: string; accountIndex: number }> {
  const derived = await params.keyManager.deriveKey({
    userId: params.userId,
    chain: params.chain,
    accountIndex: params.accountIndex ?? 0,
    purpose: 'deposit',
  });

  return {
    address: derived.address,
    path: derived.path,
    accountIndex: derived.accountIndex,
  };
}

export function getTronAddressFromPrivateKey(privateKey: string): string {
  const urls = getTronEnvUrls();
  const tronweb = new TronWeb({
    fullNode: urls.fullNode,
    solidityNode: urls.solidityNode,
    eventServer: urls.eventServer,
  });
  const address = tronweb.address.fromPrivateKey(privateKey);
  if (!address) {
    throw new Error('Unable to derive TRON address from private key');
  }
  return address;
}

function purposeToChange(purpose: 'deposit' | 'withdrawal' | 'hot' | 'cold'): number {
  switch (purpose) {
    case 'deposit':
      return 0;
    case 'withdrawal':
      return 1;
    case 'hot':
      return 2;
    case 'cold':
      return 3;
    default:
      return 0;
  }
}

function getAccountIndex(accountIndex: number, purpose: 'deposit' | 'withdrawal' | 'hot' | 'cold'): number {
  if (!Number.isInteger(accountIndex) || accountIndex < 0) {
    throw new Error('accountIndex must be a non-negative integer');
  }

  if (purpose === 'hot' || purpose === 'cold') {
    logger.warn('Hot/cold purpose uses the same HD account index as deposit/withdrawal. Enforce custody policy server-side.');
  }

  return accountIndex;
}

function toWalletChain(chain: CustodialDeriveParams['chain']): WalletChain {
  const key = String(chain).toLowerCase();
  if (key === 'tron') return WalletChain.TRON;
  if (key === 'ethereum') return WalletChain.ETHEREUM;
  if (key === 'bsc') return WalletChain.BSC;
  if (key === 'polygon') return WalletChain.POLYGON;
  if (key === 'arbitrum') return WalletChain.ARBITRUM;
  if (key === 'optimism') return WalletChain.OPTIMISM;
  if (key === 'avalanche') return WalletChain.AVALANCHE;
  if (key === 'celo') return WalletChain.CELO;
  if (key === 'linea') return WalletChain.LINEA;
  if (key === 'base') return WalletChain.BASE;
  return WalletChain.ETHEREUM;
}
