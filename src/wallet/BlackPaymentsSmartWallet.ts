/**
 * BlackPayments Smart Wallet
 * 
 * Unified wallet that combines traditional EOA functionality with
 * Alchemy Account Abstraction (Smart Accounts) capabilities.
 * 
 * Features:
 * - Smart Account creation and management (ERC-4337)
 * - Gas sponsorship (Paymaster)
 * - Multi-owner support
 * - Session keys for delegated access
 * - Social recovery mechanisms
 */

import { ethers, Wallet, JsonRpcProvider, HDNodeWallet } from 'ethers';
import { logger } from '@/lib/logger';
import {
  WalletChain,
  ChainConfig,
  USDTTokenConfig,
  MoonPayConfig,
  TransactionResult,
  BalanceResult,
  GasEstimate,
  TransferParams,
  FiatRequestParams,
} from './types';
import {
  CHAIN_CONFIGS,
  TESTNET_CONFIGS,
  USDT_TOKENS,
  getChainConfig,
  getUSDTConfig,
} from './chains';
import {
  AlchemyAccountAbstractionService,
  AAChain,
  SmartAccountConfig,
  SessionKeyConfig,
  GasSponsorshipConfig,
  AAWalletData,
  AATransactionRequest,
} from './AlchemyAccountAbstraction';

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
 * Wallet mode - traditional EOA or Smart Account (AA)
 */
export enum WalletMode {
  EOA = 'eoa',           // Traditional externally-owned account
  SMART_ACCOUNT = 'sa',  // Smart Account with AA features
}

/**
 * BlackPayments Smart Wallet Configuration
 */
export interface SmartWalletConfig {
  privateKeyOrMnemonic: string;
  chains: WalletChain[];
  customRpcUrls?: Record<WalletChain, string>;
  /** Enable Smart Account features */
  enableAA?: boolean;
  /** Default AA chain (if enableAA is true) */
  defaultAAChain?: AAChain;
}

/**
 * BlackPayments Smart Wallet
 * 
 * Unified wallet supporting both traditional EOA and Smart Account operations.
 * When AA is enabled, users get gas sponsorship, multi-owner, and session key features.
 */
export class BlackPaymentsSmartWallet {
  // Traditional wallet components
  private wallets: Map<WalletChain, Wallet>;
  private providers: Map<WalletChain, JsonRpcProvider>;
  private addresses: Map<WalletChain, string>;
  private moonpayConfig: MoonPayConfig | null;

  // AA components
  private enableAA: boolean;
  private aaService: AlchemyAccountAbstractionService;
  private aaChain: AAChain;
  private aaWalletData: AAWalletData | null = null;
  private aaInitError: string | null = null;

  // Gas buffer for safety
  private readonly GAS_BUFFER_MULTIPLIER = 130n;
  private readonly DEFAULT_GAS_LIMIT = 100000n;

  /**
   * Create a new BlackPayments Smart Wallet
   */
  constructor(config: SmartWalletConfig) {
    this.wallets = new Map();
    this.providers = new Map();
    this.addresses = new Map();
    this.moonpayConfig = null;
    this.enableAA = config.enableAA ?? false;
    this.aaService = new AlchemyAccountAbstractionService();
    this.aaChain = config.defaultAAChain ?? 'ethereum';

    // Determine if input is mnemonic or private key
    const words = config.privateKeyOrMnemonic.trim().split(/\s+/);
    const isMnemonic = words.length === 12 || words.length === 24;

    // Create wallets for each chain
    for (const chain of config.chains) {
      const config_ = CHAIN_CONFIGS[chain];
      
      if (!config_) {
        throw new Error(`Chain ${chain} not configured`);
      }
      
      const rpcUrl = config.customRpcUrls?.[chain] || config_.rpcUrl;

      // Create provider
      const provider = new JsonRpcProvider(rpcUrl);
      this.providers.set(chain, provider);

      // Create wallet based on input type
      let wallet: Wallet;
      
      if (isMnemonic) {
        const hdWallet = HDNodeWallet.fromPhrase(config.privateKeyOrMnemonic);
        wallet = new Wallet(hdWallet.privateKey, provider);
      } else {
        wallet = new Wallet(config.privateKeyOrMnemonic, provider);
      }

      this.wallets.set(chain, wallet);
    }
  }

  /**
   * Initialize the wallet and optionally create Smart Account
   */
  async initialize(): Promise<void> {
    // Initialize traditional wallet addresses
    for (const [chain, wallet] of this.wallets) {
      this.addresses.set(chain, wallet.address);
    }

    // Initialize AA if enabled
    if (this.enableAA) {
      try {
        // Get the owner private key from first wallet
        const firstWallet = this.wallets.values().next().value;
        if (firstWallet) {
          await this.aaService.initialize(firstWallet.privateKey, this.aaChain);
          
          // Create Smart Account
          this.aaWalletData = await this.aaService.createSmartAccount({
            chain: this.aaChain,
            owner: firstWallet.address,
          });
          
          logger.info('Smart Account initialized', {
            address: this.aaWalletData.smartAccountAddress,
            chain: this.aaChain,
          });
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown AA initialization error';
        logger.error('Failed to initialize AA', new Error(errorMessage));
        this.aaInitError = errorMessage;
        // Continue without AA - not critical
      }
    }
  }

  /**
   * Get wallet address for a specific chain
   */
  getAddress(chain: WalletChain): string | undefined {
    return this.addresses.get(chain);
  }

  /**
   * Get Smart Account address
   */
  getSmartAccountAddress(): string | null {
    return this.aaWalletData?.smartAccountAddress ?? null;
  }

  /**
   * Get AA initialization error (if any)
   * Use this to notify users when AA fails to initialize
   */
  getAAError(): string | null {
    return this.aaInitError;
  }

  /**
   * Check if AA is available (enabled and initialized)
   */
  isAAAvailable(): boolean {
    return this.enableAA && this.aaWalletData !== null && this.aaInitError === null;
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
   * Check native and USDT balance for a specific chain
   */
  async getBalance(chain: WalletChain): Promise<BalanceResult> {
    const wallet = this.wallets.get(chain);
    const provider = this.providers.get(chain);
    
    if (!wallet || !provider) {
      throw new Error(`Chain ${chain} not supported`);
    }

    const usdtConfig = USDT_TOKENS[chain];
    const nativeBalance = await provider.getBalance(wallet.address);
    
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
        logger.error(`Error getting balance for ${chain}`, error as Error);
      }
    }

    return balances;
  }

  /**
   * Send USDT using traditional EOA
   */
  async sendUSDT(params: TransferParams): Promise<TransactionResult> {
    const { to, amount, chain, gasSettings } = params;
    
    const wallet = this.wallets.get(chain);
    if (!wallet) {
      throw new Error(`Chain ${chain} not supported`);
    }

    const usdtConfig = USDT_TOKENS[chain];
    const usdtContract = new ethers.Contract(usdtConfig.tokenAddress, USDT_ABI, wallet);

    // Build transaction
    const tx = await usdtContract.transfer.populateTransaction(to, amount);

    if (gasSettings?.maxFeePerGas) {
      tx.maxFeePerGas = gasSettings.maxFeePerGas;
    }
    if (gasSettings?.maxPriorityFeePerGas) {
      tx.maxPriorityFeePerGas = gasSettings.maxPriorityFeePerGas;
    }
    
    if (gasSettings?.gasLimit) {
      tx.gasLimit = gasSettings.gasLimit;
    } else {
      try {
        const estimatedGas = await usdtContract.transfer.estimateGas(to, amount);
        tx.gasLimit = (estimatedGas * this.GAS_BUFFER_MULTIPLIER) / 100n;
      } catch {
        tx.gasLimit = this.DEFAULT_GAS_LIMIT;
      }
    }

    const response = await wallet.sendTransaction(tx);
    const receipt = await response.wait();
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
   * Send USDT using Smart Account (with gas sponsorship)
   */
  async sendUSDTWithAA(
    to: string,
    amount: bigint,
    gasSponsorship?: GasSponsorshipConfig
  ): Promise<{ hash: string; userOpHash: string }> {
    if (!this.aaWalletData || !this.enableAA) {
      throw new Error('AA not enabled or Smart Account not initialized');
    }

    const chain = this.aaChain;
    const owner = this.wallets.values().next().value?.address;
    
    if (!owner) {
      throw new Error('No owner wallet available');
    }

    const usdtConfig = USDT_TOKENS[WalletChain[chain.toUpperCase() as keyof typeof WalletChain]];
    const tx: AATransactionRequest = {
      to: usdtConfig.tokenAddress,
      value: 0n,
      data: this.encodeUSDTTransfer(to, amount, usdtConfig.decimals),
    };

    return this.aaService.sendTransaction(owner, chain, tx, gasSponsorship);
  }

  /**
   * Encode USDT transfer function call
   */
  private encodeUSDTTransfer(to: string, amount: bigint, decimals: number): string {
    const { Interface } = ethers;
    const abi = ['function transfer(address to, uint256 amount) returns (bool)'];
    const iface = new Interface(abi);
    return iface.encodeFunctionData('transfer', [to, amount]);
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

    let gasLimit: bigint;
    try {
      const estimated = await usdtContract.transfer.estimateGas(to, amount);
      gasLimit = (estimated * this.GAS_BUFFER_MULTIPLIER) / 100n;
    } catch {
      gasLimit = this.DEFAULT_GAS_LIMIT;
    }
    
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
   * Send native token (ETH, MATIC, BNB, etc.)
   */
  async sendNative(
    to: string,
    amount: bigint,
    chain: WalletChain,
    gasSettings?: {
      maxFeePerGas?: bigint;
      maxPriorityFeePerGas?: bigint;
      gasLimit?: bigint;
    }
  ): Promise<TransactionResult> {
    const wallet = this.wallets.get(chain);
    
    if (!wallet) {
      throw new Error(`Chain ${chain} not supported`);
    }

    const tx: ethers.TransactionRequest = {
      to,
      value: amount,
    };

    if (gasSettings?.maxFeePerGas) {
      tx.maxFeePerGas = gasSettings.maxFeePerGas;
    }
    if (gasSettings?.maxPriorityFeePerGas) {
      tx.maxPriorityFeePerGas = gasSettings.maxPriorityFeePerGas;
    }
    if (gasSettings?.gasLimit) {
      tx.gasLimit = gasSettings.gasLimit;
    }

    const response = await wallet.sendTransaction(tx);
    const receipt = await response.wait();
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
   * Add session key for delegated transactions
   */
  async addSessionKey(sessionKeyConfig: SessionKeyConfig): Promise<void> {
    if (!this.aaWalletData || !this.enableAA) {
      throw new Error('AA not enabled or Smart Account not initialized');
    }

    const owner = this.wallets.values().next().value?.address;
    if (!owner) {
      throw new Error('No owner wallet available');
    }

    await this.aaService.addSessionKey(owner, this.aaChain, sessionKeyConfig);
  }

  /**
   * Remove session key
   */
  async removeSessionKey(sessionKey: string): Promise<void> {
    if (!this.aaWalletData || !this.enableAA) {
      throw new Error('AA not enabled or Smart Account not initialized');
    }

    const owner = this.wallets.values().next().value?.address;
    if (!owner) {
      throw new Error('No owner wallet available');
    }

    await this.aaService.removeSessionKey(owner, this.aaChain, sessionKey);
  }

  /**
   * Add additional owner to Smart Account
   */
  async addOwner(newOwner: string): Promise<void> {
    if (!this.aaWalletData || !this.enableAA) {
      throw new Error('AA not enabled or Smart Account not initialized');
    }

    const owner = this.wallets.values().next().value?.address;
    if (!owner) {
      throw new Error('No owner wallet available');
    }

    await this.aaService.addOwner(owner, this.aaChain, newOwner);
  }

  /**
   * Remove owner from Smart Account
   */
  async removeOwner(ownerToRemove: string): Promise<void> {
    if (!this.aaWalletData || !this.enableAA) {
      throw new Error('AA not enabled or Smart Account not initialized');
    }

    const owner = this.wallets.values().next().value?.address;
    if (!owner) {
      throw new Error('No owner wallet available');
    }

    await this.aaService.removeOwner(owner, this.aaChain, ownerToRemove);
  }

  /**
   * Get transaction status
   */
  async getTransactionStatus(
    txHash: string,
    chain: WalletChain
  ): Promise<'pending' | 'confirmed' | 'failed'> {
    const provider = this.providers.get(chain);
    if (!provider) {
      throw new Error(`Chain ${chain} not supported`);
    }

    const receipt = await provider.getTransactionReceipt(txHash);
    if (!receipt) {
      return 'pending';
    }

    return receipt.status === 1 ? 'confirmed' : 'failed';
  }

  /**
   * Check if AA is enabled
   */
  isAAEnabled(): boolean {
    return this.enableAA;
  }

  /**
   * Get AA wallet data
   */
  getAAWalletData(): AAWalletData | null {
    return this.aaWalletData;
  }

  /**
   * Get supported AA chains
   */
  getAASupportedChains(): AAChain[] {
    return this.aaService.getSupportedChains();
  }

  /**
   * Configure MoonPay for fiat on/off-ramp
   */
  configureMoonPay(config: MoonPayConfig): void {
    this.moonpayConfig = config;
  }

  /**
   * Generate MoonPay URL for buying USDT
   */
  async getMoonPayBuyUrl(params: FiatRequestParams): Promise<string> {
    if (!this.moonpayConfig) {
      throw new Error('MoonPay not configured. Call configureMoonPay() first.');
    }

    const chain = params.chain || WalletChain.ETHEREUM;
    const address = this.getAddress(chain);
    
    if (!address) {
      throw new Error(`No address for chain ${chain}`);
    }

    const baseUrl = 'https://buy.moonpay.com';
    
    const urlParams = new URLSearchParams({
      apiKey: this.moonpayConfig.apiKey,
      currencyCode: 'usdt',
      walletAddress: address,
      fiatCurrency: params.fiatCurrency || 'usd',
    });

    if (params.fiatAmount) {
      urlParams.set('fiatAmount', params.fiatAmount.toString());
    }
    if (params.cryptoAmount) {
      urlParams.set('cryptoAmount', params.cryptoAmount.toString());
    }
    if (params.config?.theme) {
      urlParams.set('theme', params.config.theme);
    }
    if (params.config?.redirectURL) {
      urlParams.set('redirectURL', params.config.redirectURL);
    }

    return `${baseUrl}?${urlParams.toString()}`;
  }

  /**
   * Format native balance for display
   */
  private formatNativeBalance(balance: bigint, chain: WalletChain): string {
    const decimals = chain === WalletChain.TRON ? 6 : 18;
    const formatted = ethers.formatUnits(balance, decimals);
    return parseFloat(formatted).toFixed(4);
  }

  /**
   * Format USDT balance for display
   */
  private formatUSDTBalance(balance: bigint, decimals: number): string {
    const formatted = ethers.formatUnits(balance, decimals);
    return parseFloat(formatted).toFixed(2);
  }
}

/**
 * Factory function to create BlackPayments Smart Wallet
 */
export async function createSmartWallet(config: SmartWalletConfig): Promise<BlackPaymentsSmartWallet> {
  const wallet = new BlackPaymentsSmartWallet(config);
  await wallet.initialize();
  return wallet;
}

export default BlackPaymentsSmartWallet;
