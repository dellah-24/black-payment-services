/**
 * Provider Registry
 * Inspired by Trust Wallet's multi-chain provider pattern
 *
 * Manages providers for different blockchains
 */

import { BaseProvider, IRequestArguments } from './BaseProvider';
import { RPCError } from './RPCError';
import { EthereumProvider } from './EthereumProvider';
import { SolanaProvider } from './SolanaProvider';
import { BitcoinProvider } from './BitcoinProvider';
import { CosmosProvider } from './CosmosProvider';
import { TONProvider } from './TONProvider';
import { AptosProvider } from './AptosProvider';

export type ChainType = 'ethereum' | 'solana' | 'bitcoin' | 'cosmos' | 'ton' | 'aptos';

export interface ProviderConfig {
  chain: ChainType;
  rpcUrl: string;
  chainId?: string;
}

export class ProviderRegistry {
  private providers: Map<ChainType, BaseProvider> = new Map();

  register(config: ProviderConfig): BaseProvider {
    const { chain, rpcUrl, chainId } = config;

    let provider: BaseProvider;

    switch (chain) {
      case 'ethereum':
        provider = new EthereumProvider(rpcUrl, chainId);
        break;
      case 'solana':
        provider = new SolanaProvider(rpcUrl, chainId);
        break;
      case 'bitcoin':
        provider = new BitcoinProvider(rpcUrl, chainId);
        break;
      case 'cosmos':
        provider = new CosmosProvider(rpcUrl, chainId);
        break;
      case 'ton':
        provider = new TONProvider(rpcUrl, chainId);
        break;
      case 'aptos':
        provider = new AptosProvider(rpcUrl, chainId);
        break;
      default:
        throw new RPCError(-32602, `Unsupported chain: ${chain}`);
    }

    this.providers.set(chain, provider);
    return provider;
  }

  get(chain: ChainType): BaseProvider | undefined {
    return this.providers.get(chain);
  }

  has(chain: ChainType): boolean {
    return this.providers.has(chain);
  }

  async request(chain: ChainType, args: IRequestArguments): Promise<unknown> {
    const provider = this.providers.get(chain);

    if (!provider) {
      throw new RPCError(-32603, `No provider registered for chain: ${chain}`);
    }

    return provider.request(args);
  }

  setAddress(chain: ChainType, address: string): void {
    const provider = this.providers.get(chain);

    if (provider && 'setAddress' in provider) {
      (provider as { setAddress: (address: string) => void }).setAddress(address);
    }
  }

  setChainId(chain: ChainType, chainId: string): void {
    const provider = this.providers.get(chain);

    if (provider && 'setChainId' in provider) {
      (provider as { setChainId: (chainId: string) => void }).setChainId(chainId);
    }
  }

  getAddress(chain: ChainType): string | undefined {
    const provider = this.providers.get(chain);

    if (provider && 'getAddress' in provider) {
      return (provider as { getAddress: () => string | undefined }).getAddress();
    }

    return undefined;
  }

  getChainId(chain: ChainType): string | undefined {
    const provider = this.providers.get(chain);

    if (provider && 'getChainId' in provider) {
      return (provider as { getChainId: () => string | undefined }).getChainId();
    }

    return undefined;
  }

  unregister(chain: ChainType): boolean {
    return this.providers.delete(chain);
  }

  clear(): void {
    this.providers.clear();
  }

  getRegisteredChains(): ChainType[] {
    return Array.from(this.providers.keys());
  }
}

// Singleton instance
export const providerRegistry = new ProviderRegistry();
