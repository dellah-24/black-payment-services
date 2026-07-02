/**
 * BlackPayments Wallet - Core Implementation
 * 
 * Main wallet class implementing USDT operations with ethers.js
 */

import { ethers, Wallet, JsonRpcProvider, HDNodeWallet } from 'ethers';
import { TronWeb } from 'tronweb';
import { logger } from '@/lib/logger';
import { paymentRateLimiter } from '@/lib/rateLimiter';
import { deriveHDPrivateKey, getBIP44Path, isMnemonic as isMnemonicPhrase } from '@/lib/hdWallet';
import {
  getTronTRXBalance,
  getTronTransactionStatus,
  getTronUSDTBalance,
  sendTronUSDT,
} from '@/lib/tronWallet';
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
] as const;

// Create Interface for USDT contract
const USDT_INTERFACE = new ethers.Interface(USDT_ABI);

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
    // Gas safety buffer multiplier to prevent out-of-gas errors
    private readonly GAS_BUFFER_MULTIPLIER = 130n; // 30% buffer
    private readonly DEFAULT_GAS_LIMIT = 100000n;
    
    private wallets: Map<WalletChain, Wallet>;
    private providers: Map<WalletChain, JsonRpcProvider>;
    private addresses: Map<WalletChain, string>;
    private tronWeb: TronWeb | null = null;
    private tronPrivateKey: string | null = null;
    private moonpayConfig: MoonPayConfig | null;
    private isTestnet: boolean;

    /**
     * Create a new BlackPayments Wallet
     */
    constructor(
      privateKeyOrMnemonic: string,
      chains: WalletChain[],
      isTestnet = false,
      customRpcUrls?: Record<WalletChain, string>,
      options: { accountIndex?: number } = {}
    ) {
      this.wallets = new Map();
      this.providers = new Map();
      this.addresses = new Map();
      this.isTestnet = isTestnet;
      this.moonpayConfig = null;

    // Determine if input is mnemonic or private key
    const isMnemonic = isMnemonicPhrase(privateKeyOrMnemonic);
    const accountIndex = options.accountIndex ?? 0;

    // Create wallets for each chain
    for (const chain of chains) {
      const config = CHAIN_CONFIGS[chain];

      if (!config) {
        throw new Error(`Chain ${chain} not configured`);
      }

      const rpcUrl = customRpcUrls?.[chain] || config.rpcUrl;

      if (chain === WalletChain.TRON) {
        const tronPrivateKey = isMnemonic
          ? deriveHDPrivateKey(privateKeyOrMnemonic, WalletChain.TRON, accountIndex)
          : privateKeyOrMnemonic;

        const tronweb = new TronWeb({
          fullNode: rpcUrl,
          solidityNode: rpcUrl,
          eventServer: rpcUrl,
        });
        tronweb.setPrivateKey(tronPrivateKey);

        const tronAddress = tronweb.address.fromPrivateKey(tronPrivateKey);
        if (!tronAddress) {
          throw new Error(`Unable to derive TRON address for ${chain}`);
        }

        this.tronWeb = tronweb;
        this.tronPrivateKey = tronPrivateKey;
        this.addresses.set(chain, tronAddress);
        continue;
      }

      // Create provider
      const provider = new JsonRpcProvider(rpcUrl);
      this.providers.set(chain, provider);

      // Create wallet based on input type
      let wallet: Wallet;

      if (isMnemonic) {
        // It's a mnemonic - use BIP-44 derivation per chain/account
        const path = getBIP44Path({ chain, accountIndex });
        const hdWallet = HDNodeWallet.fromPhrase(privateKeyOrMnemonic, undefined, path);
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
   * NOTE: Mnemonic/seed phrase is never stored in this implementation.
   * Users must back up their seed phrase externally before wallet creation.
   * Methods intentionally removed to prevent accidental exposure.
   */



  /**
   * Check native and USDT balance for a specific chain
   */
  async getBalance(chain: WalletChain): Promise<BalanceResult> {
    const address = this.addresses.get(chain);
    if (!address) {
      throw new Error(`Chain ${chain} not supported`);
    }

    if (chain === WalletChain.TRON) {
      const [nativeBalance, usdtBalance] = await Promise.all([
        getTronTRXBalance(address),
        getTronUSDTBalance(address),
      ]);

      return {
        nativeBalance: BigInt(nativeBalance.raw),
        usdtBalance: BigInt(usdtBalance.raw),
        formattedNativeBalance: `${nativeBalance.formatted} TRX`,
        formattedUSDTBalance: `${usdtBalance.formatted} USDT`,
        chain,
      };
    }

    const wallet = this.wallets.get(chain);
    const provider = this.providers.get(chain);
    
    if (!wallet || !provider) {
      throw new Error(`Chain ${chain} not supported`);
    }

    const usdtConfig = USDT_TOKENS[chain];

    // Get native balance
    const nativeBalance = await provider.getBalance(wallet.address);
    
    // Get USDT balance
    const usdtBalance = await provider.call({
      to: usdtConfig.tokenAddress,
      data: USDT_INTERFACE.encodeFunctionData('balanceOf', [wallet.address])
    });
    const decodedBalance = USDT_INTERFACE.decodeFunctionResult('balanceOf', usdtBalance);

    const nativeBalanceBigInt = BigInt(nativeBalance.toString());
    const usdtBalanceBigInt = BigInt(decodedBalance[0].toString());

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
    if (chain === WalletChain.TRON) {
      const address = this.addresses.get(chain);
      if (!address) throw new Error(`Chain ${chain} not supported`);
      const balance = await getTronUSDTBalance(address);
      return BigInt(balance.raw);
    }

    const wallet = this.wallets.get(chain);
    if (!wallet) {
      throw new Error(`Chain ${chain} not supported`);
    }

    const usdtConfig = USDT_TOKENS[chain];
    const provider = this.providers.get(chain);
    if (!provider) throw new Error(`Chain ${chain} not supported`);
    const usdtBalance = await provider.call({
      to: usdtConfig.tokenAddress,
      data: USDT_INTERFACE.encodeFunctionData('balanceOf', [wallet.address])
    });
    const decodedBalance = USDT_INTERFACE.decodeFunctionResult('balanceOf', usdtBalance);
    return BigInt(decodedBalance[0].toString());
  }

  /**
   * Check balance for all chains
   */
  async getAllBalances(): Promise<BalanceResult[]> {
    const chains = Array.from(this.addresses.keys());
    const balances: BalanceResult[] = [];

    for (const chain of chains) {
      try {
        const balance = await this.getBalance(chain);
        balances.push(balance);
      } catch (error) {
        logger.error(`Error getting balance for ${chain}`, { error, chain });
      }
    }

    return balances;
  }

  /**
    * Send USDT to another address
    * Includes rate limiting
    */
  async sendUSDT(params: TransferParams): Promise<TransactionResult> {
    // Check rate limit first
    const rateLimit = await paymentRateLimiter.checkLimit('sendUSDT');
    if (!rateLimit.allowed) {
      throw new Error(`Rate limit exceeded. Please wait before sending another transaction.`);
    }
    
    const { to, amount, chain, gasSettings } = params;
    
    if (chain === WalletChain.TRON) {
      if (!this.tronPrivateKey || !this.tronWeb) {
        throw new Error(`TRON wallet is not initialized`);
      }

      const result = await sendTronUSDT({
        fromAddress: this.addresses.get(chain)!,
        privateKey: this.tronPrivateKey,
        to,
        amount: amount.toString(),
        feeLimit: Number(gasSettings?.gasLimit ?? 14_900_000n),
      });

      return {
        hash: result.hash,
        from: result.from,
        to,
        value: result.value,
        fee: 0n,
        status: result.status,
        chain,
        timestamp: new Date(result.timestamp),
      };
    }

    const wallet = this.wallets.get(chain);
    const provider = this.providers.get(chain);
    if (!wallet || !provider) {
      throw new Error(`Chain ${chain} not supported`);
    }

    const usdtConfig = USDT_TOKENS[chain];

    // Build transaction using Interface
    const tx: ethers.TransactionRequest = {
      to: usdtConfig.tokenAddress,
      data: USDT_INTERFACE.encodeFunctionData('transfer', [to, amount]),
      chainId: CHAIN_CONFIGS[chain].chainId,
    };

    // Add gas settings if provided
    if (gasSettings?.maxFeePerGas) {
      tx.maxFeePerGas = gasSettings.maxFeePerGas;
    }
    if (gasSettings?.maxPriorityFeePerGas) {
      tx.maxPriorityFeePerGas = gasSettings.maxPriorityFeePerGas;
    }
    
    // Use provided gas limit or estimate with buffer
    if (gasSettings?.gasLimit) {
      tx.gasLimit = gasSettings.gasLimit;
    } else {
      // Estimate gas with safety buffer
      try {
        const estimatedGas = await provider.estimateGas({
          ...tx,
          from: wallet.address,
        });
        tx.gasLimit = (estimatedGas * this.GAS_BUFFER_MULTIPLIER) / 100n;
      } catch {
        tx.gasLimit = this.DEFAULT_GAS_LIMIT;
      }
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
    if (chain === WalletChain.TRON) {
      const gasLimit = 14_900_000n;
      const gasPrice = 0n;
      return {
        gasLimit,
        gasPrice,
        maxFeePerGas: 0n,
        maxPriorityFeePerGas: 0n,
        estimatedFee: gasLimit,
        estimatedFeeFormatted: '14.9 TRX fee limit',
      };
    }

    const wallet = this.wallets.get(chain);
    const provider = this.providers.get(chain);
    
    if (!wallet || !provider) {
      throw new Error(`Chain ${chain} not supported`);
    }

    const usdtConfig = USDT_TOKENS[chain];

    // Estimate gas with safety buffer
    let gasLimit: bigint;
    try {
      const estimated = await provider.estimateGas({
        to: usdtConfig.tokenAddress,
        data: USDT_INTERFACE.encodeFunctionData('transfer', [to, amount]),
        from: wallet.address,
      });
      // Add 30% buffer for safety
      gasLimit = (estimated * this.GAS_BUFFER_MULTIPLIER) / 100n;
    } catch {
      // Use default gas limit if estimation fails
      gasLimit = this.DEFAULT_GAS_LIMIT;
    }
    
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
    if (chain === WalletChain.TRON) {
      return getTronTransactionStatus(txHash);
    }

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
    const baseUrl = 'https://sell.moonpay.com';
    
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
    return Object.keys(CHAIN_CONFIGS) as WalletChain[];
  }

  /**
   * Get chain configuration
   */
  getChainInfo(chain: WalletChain): ChainConfig {
    return CHAIN_CONFIGS[chain];
  }

  /**
    * Get USDT token configuration
    */
  getUSDTTokenInfo(chain: WalletChain): USDTTokenConfig {
    return USDT_TOKENS[chain];
  }

  /**
   * Get current gas rates
   */
  async getGasRates(chain: WalletChain): Promise<{ normal: bigint; fast: bigint }> {
    if (chain === WalletChain.TRON) {
      return {
        normal: 14_900_000n,
        fast: 30_000_000n,
      };
    }

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
     const chainConfig = CHAIN_CONFIGS[chain];
      
      if (!chainConfig) {
        return `${ethers.formatUnits(balance, 18)} unknown`;
      }
      
      // Use ethers.formatUnits for precision-safe formatting (18 decimals for native)
      const formatted = ethers.formatUnits(balance, 18);
      return `${parseFloat(formatted).toFixed(6)} ${chainConfig.symbol}`;
    }
   
   /**
    * Format USDT balance for display
    */
   private formatUSDTBalance(balance: bigint, decimals: number): string {
     // Use ethers.formatUnits for precision-safe formatting
     const formatted = ethers.formatUnits(balance, decimals);
     return `${parseFloat(formatted).toFixed(2)} USDT`;
   }

  /**
   * Dispose of wallet resources (clear from memory)
   */
  dispose(): void {
    this.wallets.clear();
    this.providers.clear();
    this.addresses.clear();
    this.tronWeb = null;
    this.tronPrivateKey = null;
  }
}

export default BlackPaymentsWallet;
