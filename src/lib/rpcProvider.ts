/**
 * RPC Provider with Fallback Support
 * Automatically switches to backup RPC if primary fails
 */

import { ethers, JsonRpcProvider } from 'ethers';
import { logger } from './logger';

export interface RpcConfig {
  urls: string[];
  chainId?: number;
}

interface ProviderInfo {
  provider: JsonRpcProvider;
  latency: number;
  isWorking: boolean;
}

export class RpcProviderManager {
  private providers: Map<string, ProviderInfo> = new Map();
  private currentUrl: string | null = null;
  private config: RpcConfig;

  constructor(config: RpcConfig) {
    this.config = config;
  }

  /**
   * Initialize and test all RPC URLs
   */
  async initialize(): Promise<void> {
    const testPromises = this.config.urls.map(async (url) => {
      const start = Date.now();
      try {
        const provider = new JsonRpcProvider(url);
        await provider.getBlockNumber();
        const latency = Date.now() - start;
        
        this.providers.set(url, {
          provider,
          latency,
          isWorking: true
        });
        
        logger.info(`RPC connected: ${url} (${latency}ms)`);
      } catch (error) {
        logger.warn(`RPC failed: ${url}`, error);
        this.providers.set(url, {
          provider: new JsonRpcProvider(url),
          latency: Infinity,
          isWorking: false
        });
      }
    });

    await Promise.all(testPromises);
    this.selectBestProvider();
  }

  /**
   * Select the best available provider (lowest latency)
   */
  private selectBestProvider(): void {
    let bestUrl: string | null = null;
    let bestLatency = Infinity;

    for (const [url, info] of this.providers) {
      if (info.isWorking && info.latency < bestLatency) {
        bestLatency = info.latency;
        bestUrl = url;
      }
    }

    if (bestUrl) {
      this.currentUrl = bestUrl;
      logger.info(`Selected best RPC: ${bestUrl} (${bestLatency}ms)`);
    }
  }

  /**
   * Get the current provider
   */
  getProvider(): JsonRpcProvider {
    if (!this.currentUrl) {
      throw new Error('No RPC provider available');
    }
    
    const info = this.providers.get(this.currentUrl);
    if (!info) {
      throw new Error('Provider not initialized');
    }
    
    return info.provider;
  }

  /**
   * Get current RPC URL
   */
  getCurrentUrl(): string | null {
    return this.currentUrl;
  }

  /**
   * Try an operation with fallback
   */
  async withFallback<T>(
    operation: (provider: JsonRpcProvider) => Promise<T>,
    maxRetries = 3
  ): Promise<T> {
    const workingUrls = Array.from(this.providers.entries())
      .filter(([_, info]) => info.isWorking)
      .sort((a, b) => a[1].latency - b[1].latency)
      .map(([url]) => url);

    if (workingUrls.length === 0) {
      throw new Error('No working RPC providers available');
    }

    let lastError: Error | null = null;

    for (let attempt = 0; attempt < maxRetries; attempt++) {
      for (const url of workingUrls) {
        try {
          const info = this.providers.get(url);
          if (!info || !info.isWorking) continue;
          
          return await operation(info.provider);
        } catch (error) {
          lastError = error as Error;
          logger.warn(`RPC call failed for ${url}, trying next...`, error);
          
          // Mark as not working temporarily
          const info = this.providers.get(url);
          if (info) info.isWorking = false;
        }
      }
    }

    throw lastError || new Error('All RPC providers failed');
  }

  /**
   * Retry with next best provider
   */
  async retryWithNewProvider<T>(
    operation: (provider: JsonRpcProvider) => Promise<T>
  ): Promise<T> {
    // Find next working provider
    const workingUrls = Array.from(this.providers.entries())
      .filter(([url, info]) => url !== this.currentUrl && info.isWorking)
      .sort((a, b) => a[1].latency - b[1].latency)
      .map(([url]) => url);

    if (workingUrls.length > 0) {
      this.currentUrl = workingUrls[0];
      const info = this.providers.get(this.currentUrl);
      if (info) {
        return await operation(info.provider);
      }
    }

    throw new Error('No fallback RPC available');
  }
}

/**
 * Transaction Manager with Nonce Management
 */
export class TransactionManager {
  private nonces: Map<string, number> = new Map();
  private pendingTransactions: Map<string, ethers.TransactionResponse> = new Map();

  /**
   * Get the current nonce for an address
   */
  async getNonce(provider: JsonRpcProvider, address: string): Promise<number> {
    const cached = this.nonces.get(address.toLowerCase());
    if (cached !== undefined) {
      return cached;
    }
    
    const nonce = await provider.getTransactionCount(address);
    this.nonces.set(address.toLowerCase(), nonce);
    return nonce;
  }

  /**
   * Increment nonce after transaction sent
   */
  incrementNonce(address: string): void {
    const key = address.toLowerCase();
    const current = this.nonces.get(key) || 0;
    this.nonces.set(key, current + 1);
  }

  /**
   * Get nonce and increment for next transaction
   */
  async getNextNonce(provider: JsonRpcProvider, address: string): Promise<number> {
    const nonce = await this.getNonce(provider, address);
    this.incrementNonce(address);
    return nonce;
  }

  /**
   * Reset nonce (useful after chain reorg)
   */
  resetNonce(address: string): void {
    this.nonces.delete(address.toLowerCase());
  }

  /**
   * Speed up transaction by replacing with higher gas
   */
  async speedUpTransaction(
    originalTx: ethers.TransactionResponse,
    multiplier: number = 1.5
  ): Promise<ethers.TransactionResponse> {
    const provider = originalTx.provider;
    if (!provider) {
      throw new Error('No provider available');
    }

    // Get current gas prices
    const feeData = await provider.getFeeData();
    const baseFee = feeData.gasPrice || 0n;
    
    // Create replacement transaction with higher gas
    const newGasPrice = Number((originalTx.gasPrice || baseFee) * BigInt(Math.floor(multiplier * 100)) / 100n);
    const replacementTx = await originalTx.replaceableTransaction(newGasPrice);

    this.pendingTransactions.set(replacementTx.hash, replacementTx);
    return replacementTx;
  }

  /**
   * Cancel pending transaction by sending 0 ETH to self with higher gas
   */
  async cancelTransaction(
    wallet: ethers.Wallet,
    originalNonce: number
  ): Promise<ethers.TransactionResponse> {
    const provider = wallet.provider;
    if (!provider) {
      throw new Error('No provider available');
    }

    // Get current gas prices
    const feeData = await provider.getFeeData();
    const gasPrice = feeData.gasPrice || 0n;
    
    // Create cancel transaction (0 ETH to self with higher gas)
    const cancelTx = await wallet.sendTransaction({
      to: wallet.address,
      value: 0,
      nonce: originalNonce,
      maxFeePerGas: gasPrice * 2n,
      maxPriorityFeePerGas: gasPrice
    });

    this.pendingTransactions.set(cancelTx.hash, cancelTx);
    return cancelTx;
  }

  /**
   * Wait for transaction confirmation with multiple blocks
   */
  async waitForConfirmation(
    tx: ethers.TransactionResponse,
    confirmations: number = 3
  ): Promise<ethers.TransactionReceipt | null> {
    try {
      return await tx.wait(confirmations);
    } catch (error) {
      logger.error('Transaction confirmation failed', error as Error);
      return null;
    }
  }
}

/**
 * Singleton instances for each chain
 */
export const rpcManagers: Map<string, RpcProviderManager> = new Map();
export const txManagers: Map<string, TransactionManager> = new Map();

/**
 * Get or create RPC manager for a chain
 */
export function getRpcManager(chainKey: string, rpcUrls: string[]): RpcProviderManager {
  let manager = rpcManagers.get(chainKey);
  
  if (!manager) {
    manager = new RpcProviderManager({ urls: rpcUrls });
    rpcManagers.set(chainKey, manager);
  }
  
  return manager;
}

/**
 * Get or create transaction manager for a chain
 */
export function getTxManager(chainKey: string): TransactionManager {
  let manager = txManagers.get(chainKey);
  
  if (!manager) {
    manager = new TransactionManager();
    txManagers.set(chainKey, manager);
  }
  
  return manager;
}