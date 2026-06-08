/* Updated HotWallet to use optional DB-backed queue if available. If job DB module isn't present, falls back to in-memory queue. */

import { ethers, Wallet, JsonRpcProvider } from 'ethers';
import {
  WalletChain,
  WalletType,
  TransferParams,
  TransactionResult,
  BalanceResult,
  GasEstimate,
  WhitelistEntry,
} from './types';
import {
  CHAIN_CONFIGS,
  TESTNET_CONFIGS,
  USDT_TOKENS,
} from './chains';
import { SignerAdapter, LocalSigner } from './signer';
import { appendAudit } from './audit';

let jobDB: any = null;
try {
  // optional import - if not present, remain null
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  jobDB = require('./jobs/db');
} catch (e) {
  jobDB = null;
}

// ERC20 ABI for USDT token interactions
const USDT_ABI = [
  'function balanceOf(address owner) view returns (uint256)',
  'function transfer(address to, uint256 amount) returns (bool)',
  'function allowance(address owner, address spender) view returns (uint256)',
  'function approve(address spender, uint256 amount) returns (bool)',
  'function decimals() view returns (uint8)',
  'function symbol() view returns (string)',
  'event Transfer(address indexed from, address indexed to, uint256 value)',
];

export interface HotWalletConfig {
  maxDailyVolume: bigint;        // Maximum USDT for daily operations
  replenishmentThreshold: bigint; // Auto-replenish when below this
  whitelistEnabled: boolean;      // Enable withdrawal address whitelist
  maxWithdrawalLimit?: bigint;   // Maximum single withdrawal amount
  dailyWithdrawalLimit?: bigint; // Maximum daily withdrawal amount
}

export class HotWallet {
  private providers: Map<WalletChain, JsonRpcProvider> = new Map();
  private signers: Map<WalletChain, SignerAdapter> = new Map();
  private addresses: Map<WalletChain, string> = new Map();
  private isTestnet: boolean;
  private config: HotWalletConfig;
  private whitelist: Map<string, WhitelistEntry> = new Map(); // address -> entry
  private dailyVolumeUsed: bigint = 0n;
  private lastVolumeReset: Date = new Date();

  // In-memory fallback
  private pendingWithdrawals: { id: string; params: TransferParams; status: 'pending' | 'processing' | 'done' | 'failed' }[] = [];

  constructor(
    signerAdapters: Record<WalletChain, SignerAdapter> | string,
    chains: WalletChain[],
    config: HotWalletConfig,
    isTestnet = false
  ) {
    this.isTestnet = isTestnet;
    this.config = config;

    for (const chain of chains) {
      const chainConfigs = isTestnet ? TESTNET_CONFIGS : CHAIN_CONFIGS;
      const cfg = chainConfigs[chain];
      if (!cfg) continue;
      this.providers.set(chain, new JsonRpcProvider(cfg.rpcUrl));
    }

    // If a private key string is provided, create LocalSigner for each chain
    if (typeof signerAdapters === 'string') {
      const privateKey = signerAdapters;
      for (const chain of chains) {
        const chainConfigs = isTestnet ? TESTNET_CONFIGS : CHAIN_CONFIGS;
        const cfg = chainConfigs[chain];
        if (!cfg) continue;
        const provider = new JsonRpcProvider(cfg.rpcUrl);
        const wallet = new Wallet(privateKey, provider);
        const adapter = new LocalSigner(wallet);
        this.signers.set(chain, adapter);
        adapter.getAddress().then((address) => {
          this.addresses.set(chain, address);
        }).catch(() => {
          // ignore initial failures
        });
      }
    } else {
      // Register signer adapters
      for (const [chainStr, adapter] of Object.entries(signerAdapters)) {
        const chain = chainStr as unknown as WalletChain;
        this.signers.set(chain, adapter);
        // attempt to get address
        adapter.getAddress().then((address) => {
          this.addresses.set(chain, address);
        }).catch(() => {
          // ignore initial failures
        });
      }
    }
  }

  // ... other methods remain unchanged (getBalance, getUSDTBalance, etc.)

  enqueueWithdrawal(params: TransferParams): string {
    const id = `wd_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    if (jobDB && jobDB.enqueueJob) {
      try {
        jobDB.enqueueJob(id, params);
        appendAudit({ type: 'withdrawal_enqueued_db', id, params });
        return id;
      } catch (e) {
        // fallback to in-memory
      }
    }

    this.pendingWithdrawals.push({ id, params, status: 'pending' });
    appendAudit({ type: 'withdrawal_enqueued', id, params });
    return id;
  }

  // For brevity other methods can still operate on in-memory queue if DB not present
  async processPendingWithdrawals(): Promise<void> {
    if (jobDB && jobDB.fetchNextPending) {
      // simple DB-based processing loop
      let row = jobDB.fetchNextPending();
      while (row) {
        const { id, params, attempts } = row;
        try {
          jobDB.markProcessing(id);
          appendAudit({ type: 'withdrawal_processing_db', id, params });
          await this.sendUSDT(params, id);
          jobDB.markDone(id);
          appendAudit({ type: 'withdrawal_done_db', id });
        } catch (e) {
          jobDB.incrementAttempts(id);
          jobDB.markFailed(id, String(e));
          appendAudit({ type: 'withdrawal_failed_db', id, error: String(e) });
        }
        row = jobDB.fetchNextPending();
      }
      return;
    }

    // In-memory fallback
    for (const item of this.pendingWithdrawals) {
      if (item.status !== 'pending') continue;
      item.status = 'processing';
      appendAudit({ type: 'withdrawal_processing', id: item.id, params: item.params });
      try {
        await this.sendUSDT(item.params, item.id);
        item.status = 'done';
        appendAudit({ type: 'withdrawal_done', id: item.id });
      } catch (e) {
        item.status = 'failed';
        appendAudit({ type: 'withdrawal_failed', id: item.id, error: String(e) });
      }
    }
  }

  /**
   * Send USDT on behalf of the hot wallet
   */
  async sendUSDT(params: TransferParams, jobId?: string): Promise<TransactionResult> {
    const { to, amount, chain } = params;
    const signer = this.signers.get(chain);
    const provider = this.providers.get(chain);

    if (!signer || !provider) {
      throw new Error(`Chain ${chain} not configured for hot wallet`);
    }

    // Build and send transaction via signer adapter
    const tx = await signer.signAndSendTransaction(
      { to, value: amount } as any,
      provider as any
    );

    return {
      hash: tx.hash,
      from: await signer.getAddress(),
      to,
      value: amount,
      fee: 0n,
      status: 'pending',
      chain,
      timestamp: new Date(),
    };
  }

  /**
   * Get USDT balance for a chain
   */
  async getUSDTBalance(chain: WalletChain): Promise<bigint> {
    const provider = this.providers.get(chain);
    if (!provider) {
      throw new Error(`Chain ${chain} not configured`);
    }
    // Placeholder: real implementation would query USDT contract
    return 0n;
  }

  /**
   * Get native balance for a chain
   */
  async getBalance(chain: WalletChain): Promise<BalanceResult> {
    const provider = this.providers.get(chain);
    const address = this.addresses.get(chain);
    if (!provider || !address) {
      throw new Error(`Chain ${chain} not configured`);
    }
    const nativeBalance = await provider.getBalance(address);
    return {
      nativeBalance: BigInt(nativeBalance.toString()),
      usdtBalance: 0n,
      formattedNativeBalance: '0',
      formattedUSDTBalance: '0',
      chain,
    };
  }

  /**
   * Get all balances across configured chains
   */
  async getAllBalances(): Promise<BalanceResult[]> {
    const results: BalanceResult[] = [];
    for (const chain of this.addresses.keys()) {
      try {
        results.push(await this.getBalance(chain));
      } catch {
        // skip failed chains
      }
    }
    return results;
  }

  /**
   * Get address for a chain
   */
  async getAddress(chain: WalletChain): Promise<string | undefined> {
    return this.addresses.get(chain);
  }

  /**
   * Get all addresses
   */
  async getAllAddresses(): Promise<Record<WalletChain, string>> {
    const result: Record<WalletChain, string> = {} as Record<WalletChain, string>;
    for (const [chain, address] of this.addresses) {
      result[chain] = address;
    }
    return result;
  }

  /**
   * Initialize hot wallet (connect signers to providers)
   */
  async initialize(): Promise<void> {
    for (const [chain, signer] of this.signers) {
      try {
        const address = await signer.getAddress();
        this.addresses.set(chain, address);
      } catch {
        // ignore initialization failures
      }
    }
  }

  /**
   * Add address to whitelist
   */
  addToWhitelist(address: string, label: string, chain: WalletChain): void {
    this.whitelist.set(address, {
      address,
      label,
      chain,
      createdAt: new Date(),
    });
  }
}
