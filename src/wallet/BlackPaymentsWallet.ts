/**
 * BlackPayments Wallet - Core Implementation
 * 
 * Main wallet class implementing USDT operations with ethers.js
 */

import { ethers, Wallet, JsonRpcProvider, Mnemonic, HDNodeWallet } from 'ethers';
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
  getSupportedChains,
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
 * BlackPayments Wallet
 * 
 * A comprehensive USDT wallet supporting multiple EVM chains with:
 * - Balance checking
 * - Sending USDT transactions
 * - Receiving USDT deposits
 * - Fiat on/off-ramp via MoonPay
 */
export class BlackPaymentsWallet {
  private wallets: Map<WalletChain, Wallet>;
  private providers: Map<WalletChain, JsonRpcProvider>;
  private addresses: Map<WalletChain, string>;
  private isTestnet: boolean;
  private moonpayConfig: MoonPayConfig | null;

  /**
   * Create a new BlackPayments Wallet
   */
  constructor(
    privateKeyOrMnemonic: string,
    chains: WalletChain[],
    isTestnet = false,
    customRpcUrls?: Record<WalletChain, string>
  ) {
    this.wallets = new Map();
    this.providers = new Map();
    this.addresses = new Map();
    this.isTestnet = isTestnet;
    this.moonpayConfig = null;

      // Determine if input is mnemonic or private key
    const words = privateKeyOrMnemonic.trim().split(/\s+/);
    const isMnemonic = words.length === 12 || words.length === 24;

    // Create wallets for each chain
    for (const chain of chains) {
      const config = isTestnet 
        ? TESTNET_CONFIGS[chain] 
        : CHAIN_CONFIGS[chain];
      
      const rpcUrl = customRpcUrls?.[chain] || config.rpcUrl;

      // Create provider
      const provider = new JsonRpcProvider(rpcUrl);
      this.providers.set(chain, provider);

      // Create wallet based on input type
      let wallet: Wallet;
      
      if (isMnemonic) {
        // It's a mnemonic - use HDNodeWallet
        const hdWallet = HDNodeWallet.fromPhrase(privateKeyOrMnemonic);
        wallet = new Wallet(hdWallet.privateKey, provider);
      } else {
        // It's a private key
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
   * Get the mnemonic phrase (for backup purposes)
   * WARNING: Store securely, never expose in production
   */
  getMnemonic(): string {
    throw new Error('Mnemonic not stored. Use createWalletWithExistingSeed to preserve mnemonic.');
  }

  /**
   * Get seed phrase (alias for getMnemonic)
   */
  getSeedPhrase(): string {
    return this.getMnemonic();
  }

  /**
   * Get private key for a specific chain
   * WARNING: Keep private keys secure
   */
  getPrivateKey(chain: WalletChain): string | undefined {
    return this.wallets.get(chain)?.privateKey;
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
   * Send USDT to another address
   */
  async sendUSDT(params: TransferParams): Promise<TransactionResult> {
    const { to, amount, chain, gasSettings } = params;
    
    const wallet = this.wallets.get(chain);
    if (!wallet) {
      throw new Error(`Chain ${chain} not supported`);
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

    // Build transaction
    const tx: ethers.TransactionRequest = {
      to,
      value: amount,
    };

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

    // Build MoonPay URL
    const baseUrl = this.moonpayConfig.isTestnet 
      ? 'https://buy-sandbox.moonpay.com' 
      : 'https://buy.moonpay.com';
    
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
   * Generate MoonPay URL for selling USDT
   */
  async getMoonPaySellUrl(params: FiatRequestParams): Promise<string> {
    if (!this.moonpayConfig) {
      throw new Error('MoonPay not configured. Call configureMoonPay() first.');
    }

    const chain = params.chain || WalletChain.ETHEREUM;
    const address = this.getAddress(chain);
    
    if (!address) {
      throw new Error(`No address for chain ${chain}`);
    }

    // Build MoonPay URL
    const baseUrl = this.moonpayConfig.isTestnet 
      ? 'https://sell-sandbox.moonpay.com' 
      : 'https://sell.moonpay.com';
    
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
   * Buy USDT (alias for getMoonPayBuyUrl)
   */
  async buyUSDT(params: FiatRequestParams): Promise<string> {
    return this.getMoonPayBuyUrl(params);
  }

  /**
   * Sell USDT (alias for getMoonPaySellUrl)
   */
  async sellUSDT(params: FiatRequestParams): Promise<string> {
    return this.getMoonPaySellUrl(params);
  }

  /**
   * Get supported chains
   */
  getSupportedChainsList(): WalletChain[] {
    return getSupportedChains();
  }

  /**
   * Get chain configuration
   */
  getChainInfo(chain: WalletChain): ChainConfig {
    return getChainConfig(chain, this.isTestnet);
  }

  /**
   * Get USDT token configuration
   */
  getUSDTTokenInfo(chain: WalletChain): USDTTokenConfig {
    return getUSDTConfig(chain);
  }

  /**
   * Get current gas rates
   */
  async getGasRates(chain: WalletChain): Promise<{ normal: bigint; fast: bigint }> {
    const provider = this.providers.get(chain);
    if (!provider) {
      throw new Error(`Chain ${chain} not supported`);
    }

    const feeData = await provider.getFeeData();
    const gasPrice = feeData.gasPrice || 0n;

    return {
      normal: gasPrice,
      fast: (gasPrice * 12n) / 10n, // 20% higher for fast
    };
  }

  /**
   * Validate an address
   */
  isValidAddress(address: string): boolean {
    try {
      return ethers.isAddress(address);
    } catch {
      return false;
    }
  }

  /**
   * Format native balance for display
   */
  private formatNativeBalance(balance: bigint, chain: WalletChain): string {
    const chainConfig = this.isTestnet 
      ? TESTNET_CONFIGS[chain] 
      : CHAIN_CONFIGS[chain];
    
    const formatted = Number(balance) / Math.pow(10, 18);
    return `${formatted.toFixed(6)} ${chainConfig.symbol}`;
  }

  /**
   * Format USDT balance for display
   */
  private formatUSDTBalance(balance: bigint, decimals: number): string {
    const formatted = Number(balance) / Math.pow(10, decimals);
    return `${formatted.toFixed(2)} USDT`;
  }

  /**
   * Dispose of wallet resources (clear from memory)
   */
  dispose(): void {
    this.wallets.clear();
    this.providers.clear();
    this.addresses.clear();
  }
}

export default BlackPaymentsWallet;
