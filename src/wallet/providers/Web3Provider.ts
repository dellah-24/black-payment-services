/**
 * Web3 Provider
 * Inspired by Trust Wallet's Web3 provider pattern
 *
 * Provides a unified interface for DApp connections
 * Supports EIP-1193 standard for Ethereum and similar standards for other chains
 */

import { EventEmitter } from 'events';
import { BaseProvider, IRequestArguments } from './BaseProvider';
import { RPCError } from './RPCError';
import { ProviderRegistry, ChainType } from './ProviderRegistry';

export interface Web3ProviderConfig {
  registry: ProviderRegistry;
  defaultChain?: ChainType;
}

export class Web3Provider extends EventEmitter {
  private registry: ProviderRegistry;
  private defaultChain: ChainType;
  private currentChain: ChainType | null = null;

  constructor(config: Web3ProviderConfig) {
    super();
    this.registry = config.registry;
    this.defaultChain = config.defaultChain || 'ethereum';
    this.currentChain = this.defaultChain;
  }

  async request<T>(args: IRequestArguments): Promise<T> {
    const chain = this.currentChain || this.defaultChain;

    try {
      const result = await this.registry.request(chain, args);
      return result as T;
    } catch (error) {
      const rpcError = RPCError.fromError(error);
      this.emit('error', rpcError);
      throw rpcError;
    }
  }

  async switchChain(chain: ChainType): Promise<void> {
    if (!this.registry.has(chain)) {
      throw RPCError.unsupportedMethod(`Chain not supported: ${chain}`);
    }

    this.currentChain = chain;
    this.emit('chainChanged', chain);
  }

  getCurrentChain(): ChainType | null {
    return this.currentChain;
  }

  getDefaultChain(): ChainType {
    return this.defaultChain;
  }

  setDefaultChain(chain: ChainType): void {
    this.defaultChain = chain;
  }

  getAddress(chain?: ChainType): string | undefined {
    const targetChain = chain || this.currentChain || this.defaultChain;
    return this.registry.getAddress(targetChain);
  }

  setAddress(address: string, chain?: ChainType): void {
    const targetChain = chain || this.currentChain || this.defaultChain;
    this.registry.setAddress(targetChain, address);
    this.emit('accountsChanged', [address]);
  }

  getChainId(chain?: ChainType): string | undefined {
    const targetChain = chain || this.currentChain || this.defaultChain;
    return this.registry.getChainId(targetChain);
  }

  setChainId(chainId: string, chain?: ChainType): void {
    const targetChain = chain || this.currentChain || this.defaultChain;
    this.registry.setChainId(targetChain, chainId);
    this.emit('chainChanged', chainId);
  }

  getSupportedChains(): ChainType[] {
    return this.registry.getRegisteredChains();
  }

  isChainSupported(chain: ChainType): boolean {
    return this.registry.has(chain);
  }

  getProvider(chain: ChainType): BaseProvider | undefined {
    return this.registry.get(chain);
  }
}
