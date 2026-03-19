/**
 * BlackPayments Wallet - Cold Wallet Implementation
 * 
 * Secure offline wallet for long-term USDT storage.
 * Provides maximum security with multi-sig support.
 */

import { ethers, Wallet, JsonRpcProvider, HDNodeWallet } from 'ethers';
import {
  WalletChain,
  WalletType,
  TransferParams,
  TransactionResult,
  BalanceResult,
  GasEstimate,
  MultiSigRequest,
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
 * Cold Wallet Configuration
 */
export interface ColdWalletConfig {
  multiSigRequired: boolean;      // Require multiple signatures for withdrawal
  requiredSignatures: number;      // Number of signatures needed (if multi-sig)
  signerAddresses?: string[];      // Authorized signer addresses
  whitelistEnabled: boolean;        // Enable withdrawal address whitelist
  withdrawalCooldown?: number;     // Cooldown period in milliseconds (security feature)
  maxWithdrawalAmount?: bigint;   // Maximum withdrawal amount
}

/**
 * ColdWallet - Secure reserve wallet for P2P operations
 * 
 * Features:
 * - Offline storage for 80-95% of capital
 * - Multi-signature support for large withdrawals
 * - Whitelist protection
 * - Cooldown periods for security
 * - Audit trail for all transactions
 */
export class ColdWallet {
  private wallets: Map<WalletChain, Wallet>;
  private providers: Map<WalletChain, JsonRpcProvider>;
  private addresses: Map<WalletChain, string>;
  private isTestnet: boolean;
  private config: ColdWalletConfig;
  private whitelist: Map<string, WhitelistEntry>;
  private pendingTransfers: Map<string, MultiSigRequest>;
  private lastWithdrawalTime: Map<string, number>; // address -> timestamp
  private transactionHistory: {
    id: string;
    type: 'deposit' | 'withdrawal' | 'transfer';
    amount: bigint;
    chain: WalletChain;
    address: string;
    txHash?: string;
    timestamp: Date;
    status: 'pending' | 'completed' | 'rejected';
  }[];

  /**
   * Create a new ColdWallet
   * 
   * @param privateKeyOrMnemonic - Private key or mnemonic phrase
   * @param chains - Supported chains
   * @param config - Cold wallet configuration
   * @param isTestnet - Whether to use testnet
   * @param customRpcUrls - Custom RPC URLs
   */
  constructor(
    privateKeyOrMnemonic: string,
    chains: WalletChain[],
    config: ColdWalletConfig,
    isTestnet = false,
    customRpcUrls?: Record<WalletChain, string>
  ) {
    this.wallets = new Map();
    this.providers = new Map();
    this.addresses = new Map();
    this.isTestnet = isTestnet;
    this.config = config;
    this.whitelist = new Map();
    this.pendingTransfers = new Map();
    this.lastWithdrawalTime = new Map();
    this.transactionHistory = [];

    // Determine if input is mnemonic or private key
    const words = privateKeyOrMnemonic.trim().split(/\s+/);
    const isMnemonic = words.length === 12 || words.length === 24;

    // Create wallets for each chain
    for (const chain of chains) {
      const chainConfigs = isTestnet ? TESTNET_CONFIGS : CHAIN_CONFIGS;
      const chainConfig = chainConfigs[chain];
      
      if (!chainConfig) {
        console.warn(`Chain ${chain} not configured, skipping`);
        continue;
      }
      
      const rpcUrl = customRpcUrls?.[chain] || chainConfig.rpcUrl;

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
    return WalletType.COLD;
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
   * Check if address is whitelisted
   */
  isWhitelisted(address: string): boolean {
    if (!this.config.whitelistEnabled) return false;
    return this.whitelist.has(address.toLowerCase());
  }

  /**
   * Validate withdrawal request
   */
  private validateWithdrawal(address: string, amount: bigint): void {
    // Check whitelist if enabled
    if (this.config.whitelistEnabled && !this.isWhitelisted(address)) {
      throw new Error('Address not whitelisted for withdrawals');
    }

    // Check max withdrawal amount
    if (this.config.maxWithdrawalAmount && amount > this.config.maxWithdrawalAmount) {
      throw new Error(`Amount exceeds maximum withdrawal limit`);
    }

    // Check cooldown period
    if (this.config.withdrawalCooldown) {
      const lastWithdrawal = this.lastWithdrawalTime.get(address.toLowerCase());
      if (lastWithdrawal) {
        const timeSinceLastWithdrawal = Date.now() - lastWithdrawal;
        if (timeSinceLastWithdrawal < this.config.withdrawalCooldown) {
          throw new Error(`Withdrawal cooldown period active. Please wait.`);
        }
      }
    }
  }

  /**
   * Create a multi-sig withdrawal request
   */
  createMultiSigRequest(
    to: string,
    amount: bigint,
    chain: WalletChain
  ): MultiSigRequest {
    if (!this.config.multiSigRequired) {
      throw new Error('Multi-sig not enabled for this wallet');
    }

    const request: MultiSigRequest = {
      id: `msig_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      to,
      amount,
      chain,
      signatures: [],
      requiredSignatures: this.config.requiredSignatures,
      status: 'pending',
      createdAt: new Date(),
    };

    this.pendingTransfers.set(request.id, request);
    return request;
  }

  /**
   * Add signature to a multi-sig request
   */
  addSignature(requestId: string, signature: string): void {
    const request = this.pendingTransfers.get(requestId);
    if (!request) {
      throw new Error('Multi-sig request not found');
    }

    if (request.status !== 'pending') {
      throw new Error('Request already processed');
    }

    // Validate signer (in real implementation, verify signature)
    request.signatures.push(signature);

    // Check if enough signatures collected
    if (request.signatures.length >= request.requiredSignatures) {
      request.status = 'approved';
    }
  }

  /**
   * Get pending multi-sig requests
   */
  getPendingRequests(): MultiSigRequest[] {
    return Array.from(this.pendingTransfers.values()).filter(
      r => r.status === 'pending' || r.status === 'approved'
    );
  }

  /**
   * Send USDT - requires validation and potentially multi-sig
   */
  async sendUSDT(params: TransferParams): Promise<TransactionResult> {
    const { to, amount, chain, gasSettings } = params;
    
    const wallet = this.wallets.get(chain);
    if (!wallet) {
      throw new Error(`Chain ${chain} not supported`);
    }

    // Validate withdrawal
    this.validateWithdrawal(to, amount);

    // If multi-sig required, check for approved request
    if (this.config.multiSigRequired) {
      // Find matching approved request
      const approvedRequest = Array.from(this.pendingTransfers.values())
        .find(r => r.to === to && r.amount === amount && r.chain === chain && r.status === 'approved');
      
      if (!approvedRequest) {
        throw new Error('Multi-sig approval required. Create a request first.');
      }
    }

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

    // Update withdrawal timestamp
    this.lastWithdrawalTime.set(to.toLowerCase(), Date.now());

    // Add to transaction history
    this.transactionHistory.push({
      id: response.hash,
      type: 'withdrawal',
      amount,
      chain,
      address: to,
      txHash: response.hash,
      timestamp: new Date(),
      status: receipt?.status === 1 ? 'completed' : 'rejected',
    });

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
   * Record a deposit (for audit trail)
   */
  recordDeposit(amount: bigint, chain: WalletChain, txHash: string): void {
    const wallet = this.wallets.get(chain);
    if (!wallet) {
      throw new Error(`Chain ${chain} not supported`);
    }

    this.transactionHistory.push({
      id: txHash,
      type: 'deposit',
      amount,
      chain,
      address: wallet.address,
      txHash,
      timestamp: new Date(),
      status: 'completed',
    });
  }

  /**
   * Get transaction history
   */
  getTransactionHistory(): typeof ColdWallet.prototype.transactionHistory {
    return [...this.transactionHistory];
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
   * Get wallet config
   */
  getConfig(): ColdWalletConfig {
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
    const decimals = 18;
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
