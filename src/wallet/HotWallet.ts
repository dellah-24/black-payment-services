/**
 * BlackPayments Wallet - Hot Wallet Implementation
 * 
 * Operational wallet for daily P2P trading activities.
 * Connected to the internet 24/7 for instant transactions.
 */

import { ethers, Wallet, JsonRpcProvider, HDNodeWallet } from 'ethers';
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

/**
 * Hot Wallet Configuration
 */
export interface HotWalletConfig {
  maxDailyVolume: bigint;        // Maximum USDT for daily operations
  replenishmentThreshold: bigint; // Auto-replenish when below this
  whitelistEnabled: boolean;      // Enable withdrawal address whitelist
  maxWithdrawalLimit?: bigint;   // Maximum single withdrawal amount
  dailyWithdrawalLimit?: bigint; // Maximum daily withdrawal amount
}

/**
 * HotWallet - Operational wallet for P2P trading
 * 
 * Features:
 * - Always online for instant transactions
 * - Limited funds (5-20% of total capital)
 * - Whitelist protection for withdrawals
 * - Daily volume limits
 * - Automatic rebalancing alerts
 */
export class HotWallet {
  private wallets: Map<WalletChain, Wallet>;
  private providers: Map<WalletChain, JsonRpcProvider>;
  private addresses: Map<WalletChain, string>;
  private isTestnet: boolean;
  private config: HotWalletConfig;
  private whitelist: Map<string, WhitelistEntry>; // address -> entry
  private dailyVolumeUsed: bigint;
  private lastVolumeReset: Date;

  /**
   * Create a new HotWallet
   */
  constructor(
    privateKeyOrMnemonic: string,
    chains: WalletChain[],
    config: HotWalletConfig,
    isTestnet = false,
    customRpcUrls?: Record<WalletChain, string>
  ) {
    this.wallets = new Map();
    this.providers = new Map();
    this.addresses = new Map();
    this.isTestnet = isTestnet;
    this.config = config;
    this.whitelist = new Map();
    this.dailyVolumeUsed = 0n;
    this.lastVolumeReset = new Date();

    // Determine if input is mnemonic or private key
    const words = privateKeyOrMnemonic.trim().split(/\s+/);
    const isMnemonic = words.length === 12 || words.length === 24;

    // Create wallets for each chain
    for (const chain of chains) {
      const chainConfigs = isTestnet ? TESTNET_CONFIGS : CHAIN_CONFIGS;
      const config = chainConfigs[chain];
      
      if (!config) {
        console.warn(`Chain ${chain} not configured, skipping`);
        continue;
      }
      
      const rpcUrl = customRpcUrls?.[chain] || config.rpcUrl;

      // Create provider
      const provider = new JsonRpcProvider(rpcUrl);
      this.providers.set(chain, provider);

      // Create wallet based on input type
      let wallet: Wallet;
      
      if (isMnemonic) {
        const hdWallet = HDNodeWallet.fromPhrase(privateKeyOrMnemonic);
        wallet = new Wallet(hdWallet.privateKey, provider);
      } else {
        wallet = new Wallet(privateKeyOrMnemonic, provider);
      }

      this.wallets.set(chain, wallet);
    }
  }

  /**
   * Initialize the wallet and get addresses
   */
  async initialize(): Promise<void> {
    for (const [chain, wallet] of this.wallets) {
      this.addresses.set(chain, wallet.address);
    }
    this.resetDailyVolumeIfNeeded();
  }

  /**
   * Reset daily volume counter if it's a new day
   */
  private resetDailyVolumeIfNeeded(): void {
    const now = new Date();
    const lastReset = this.lastVolumeReset;
    
    // Reset if it's a different day
    if (now.getDate() !== lastReset.getDate() || 
        now.getMonth() !== lastReset.getMonth() ||
        now.getFullYear() !== lastReset.getFullYear()) {
      this.dailyVolumeUsed = 0n;
      this.lastVolumeReset = now;
    }
  }

  /**
   * Get wallet address for a specific chain
   */
  getAddress(chain: WalletChain): string | undefined {
    return this.addresses.get(chain);
  }

  /**
   * Get all wallet addresses
   */
  getAllAddresses(): Record<WalletChain, string> {
    const result: Record<WalletChain, string> = {} as Record<WalletChain, string>;
    for (const [chain, address] of this.addresses) {
      result[chain] = address;
    }
    return result;
  }

  /**
   * Get wallet type
   */
  getType(): WalletType {
    return WalletType.HOT;
  }

  /**
   * Check native and USDT balance for a specific chain
   */
  async getBalance(chain: WalletChain): Promise<BalanceResult> {
    const wallet = this.wallets.get(chain);
    const provider = this.providers.get(chain);
    
    if (!wallet || !provider) {
      throw new Error(`Chain ${chain} not supported`);
    }

    const usdtConfig = USDT_TOKENS[chain];

    // Get native balance
    const nativeBalance = await provider.getBalance(wallet.address);
    
    // Get USDT balance
    const usdtContract = new ethers.Contract(usdtConfig.tokenAddress, USDT_ABI, wallet);
    const usdtBalance = await usdtContract.balanceOf(wallet.address);

    const nativeBalanceBigInt = BigInt(nativeBalance.toString());
    const usdtBalanceBigInt = BigInt(usdtBalance.toString());

    return {
      nativeBalance: nativeBalanceBigInt,
      usdtBalance: usdtBalanceBigInt,
      formattedNativeBalance: this.formatNativeBalance(nativeBalanceBigInt, chain),
      formattedUSDTBalance: this.formatUSDTBalance(usdtBalanceBigInt, usdtConfig.decimals),
      chain,
    };
  }

  /**
   * Check USDT balance for a specific chain
   */
  async getUSDTBalance(chain: WalletChain): Promise<bigint> {
    const wallet = this.wallets.get(chain);
    if (!wallet) {
      throw new Error(`Chain ${chain} not supported`);
    }

    const usdtConfig = USDT_TOKENS[chain];
    const usdtContract = new ethers.Contract(usdtConfig.tokenAddress, USDT_ABI, wallet);
    const balance = await usdtContract.balanceOf(wallet.address);
    return BigInt(balance.toString());
  }

  /**
   * Check balance for all chains
   */
  async getAllBalances(): Promise<BalanceResult[]> {
    const chains = Array.from(this.wallets.keys());
    const balances: BalanceResult[] = [];

    for (const chain of chains) {
      try {
        const balance = await this.getBalance(chain);
        balances.push(balance);
      } catch (error) {
        console.error(`Error getting balance for ${chain}:`, error);
      }
    }

    return balances;
  }

  /**
   * Add an address to the whitelist
   */
  addToWhitelist(entry: WhitelistEntry): void {
    if (this.config.whitelistEnabled) {
      this.whitelist.set(entry.address.toLowerCase(), entry);
    }
  }

  /**
   * Remove an address from the whitelist
   */
  removeFromWhitelist(address: string): void {
    this.whitelist.delete(address.toLowerCase());
  }

  /**
   * Get whitelist entry for an address
   */
  getWhitelistEntry(address: string): WhitelistEntry | undefined {
    return this.whitelist.get(address.toLowerCase());
  }

  /**
   * Get all whitelist entries
   */
  getWhitelist(): WhitelistEntry[] {
    return Array.from(this.whitelist.values());
  }

  /**
   * Check if address is whitelisted
   */
  isWhitelisted(address: string): boolean {
    if (!this.config.whitelistEnabled) return true; // If whitelist disabled, allow all
    return this.whitelist.has(address.toLowerCase());
  }

  /**
   * Validate withdrawal against limits
   */
  private validateWithdrawal(address: string, amount: bigint): void {
    this.resetDailyVolumeIfNeeded();

    // Check whitelist if enabled
    if (this.config.whitelistEnabled && !this.isWhitelisted(address)) {
      throw new Error('Address not whitelisted for withdrawals');
    }

    // Check max single withdrawal
    if (this.config.maxWithdrawalLimit && amount > this.config.maxWithdrawalLimit) {
      throw new Error(`Amount exceeds maximum withdrawal limit of ${this.config.maxWithdrawalLimit}`);
    }

    // Check daily volume limit
    const potentialDailyTotal = this.dailyVolumeUsed + amount;
    if (potentialDailyTotal > this.config.maxDailyVolume) {
      throw new Error(`Amount would exceed daily volume limit. Used: ${this.dailyVolumeUsed}, Limit: ${this.config.maxDailyVolume}`);
    }

    // Check daily limit from whitelist entry if exists
    const whitelistEntry = this.whitelist.get(address.toLowerCase());
    if (whitelistEntry?.dailyLimit && amount > whitelistEntry.dailyLimit) {
      throw new Error(`Amount exceeds daily limit for this address`);
    }

    // Check max withdrawal from whitelist entry
    if (whitelistEntry?.maxWithdrawal && amount > whitelistEntry.maxWithdrawal) {
      throw new Error(`Amount exceeds maximum withdrawal limit for this address`);
    }
  }

  /**
   * Send USDT to another address
   */
  async sendUSDT(params: TransferParams): Promise<TransactionResult> {
    const { to, amount, chain, gasSettings } = params;
    
    const wallet = this.wallets.get(chain);
    if (!wallet) {
      throw new Error(`Chain ${chain} not supported`);
    }

    // Validate withdrawal
    this.validateWithdrawal(to, amount);

    const usdtConfig = USDT_TOKENS[chain];

    // Create USDT contract instance
    const usdtContract = new ethers.Contract(usdtConfig.tokenAddress, USDT_ABI, wallet);

    // Build transaction
    const tx = await usdtContract.transfer.populateTransaction(to, amount);

    // Add gas settings if provided
    if (gasSettings?.maxFeePerGas) {
      tx.maxFeePerGas = gasSettings.maxFeePerGas;
    }
    if (gasSettings?.maxPriorityFeePerGas) {
      tx.maxPriorityFeePerGas = gasSettings.maxPriorityFeePerGas;
    }
    if (gasSettings?.gasLimit) {
      tx.gasLimit = gasSettings.gasLimit;
    }

    // Send transaction
    const response = await wallet.sendTransaction(tx);
    const receipt = await response.wait();

    // Update daily volume
    this.dailyVolumeUsed += amount;

    // Get fee
    const fee = response.gasPrice ? response.gasPrice * (receipt?.gasUsed || 0n) : 0n;

    return {
      hash: response.hash,
      from: wallet.address,
      to,
      value: amount,
      fee,
      status: receipt?.status === 1 ? 'confirmed' : 'failed',
      chain,
      timestamp: new Date(),
    };
  }

  /**
   * Quote USDT transfer (estimate fees)
   */
  async quoteUSDTTransfer(
    to: string,
    amount: bigint,
    chain: WalletChain
  ): Promise<GasEstimate> {
    const wallet = this.wallets.get(chain);
    const provider = this.providers.get(chain);
    
    if (!wallet || !provider) {
      throw new Error(`Chain ${chain} not supported`);
    }

    const usdtConfig = USDT_TOKENS[chain];
    const usdtContract = new ethers.Contract(usdtConfig.tokenAddress, USDT_ABI, wallet);

    // Estimate gas
    const gasLimit = await usdtContract.transfer.estimateGas(to, amount);
    
    // Get fee data
    const feeData = await provider.getFeeData();
    
    const gasPrice = feeData.gasPrice || 0n;
    const maxFeePerGas = feeData.maxFeePerGas || 0n;
    const maxPriorityFeePerGas = feeData.maxPriorityFeePerGas || 0n;
    
    const estimatedFee = gasLimit * gasPrice;

    return {
      gasLimit,
      gasPrice,
      maxFeePerGas,
      maxPriorityFeePerGas,
      estimatedFee,
      estimatedFeeFormatted: this.formatNativeBalance(estimatedFee, chain),
    };
  }

  /**
   * Get remaining daily volume
   */
  getRemainingDailyVolume(): bigint {
    this.resetDailyVolumeIfNeeded();
    return this.config.maxDailyVolume - this.dailyVolumeUsed;
  }

  /**
   * Check if replenishment is needed
   */
  needsReplenishment(currentBalance: bigint): boolean {
    return currentBalance < this.config.replenishmentThreshold;
  }

  /**
   * Get wallet config
   */
  getConfig(): HotWalletConfig {
    return { ...this.config };
  }

  /**
   * Get supported chains
   */
  getSupportedChains(): WalletChain[] {
    return Array.from(this.wallets.keys());
  }

  /**
   * Format native balance for display
   */
  private formatNativeBalance(balance: bigint, chain: WalletChain): string {
    const chainConfig = this.isTestnet ? TESTNET_CONFIGS[chain] : CHAIN_CONFIGS[chain];
    const decimals = chain === WalletChain.BSC ? 18 : 18; // Adjust as needed
    const formatted = Number(balance) / Math.pow(10, decimals);
    return `${formatted.toFixed(6)} ${chainConfig?.symbol || 'ETH'}`;
  }

  /**
   * Format USDT balance for display
   */
  private formatUSDTBalance(balance: bigint, decimals: number): string {
    const formatted = Number(balance) / Math.pow(10, decimals);
    return `${formatted.toFixed(2)} USDT`;
  }
}
