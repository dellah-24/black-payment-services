/**
 * Base Provider
 * Inspired by Trust Wallet's provider pattern
 *
 * All chain providers should extend this base class
 */

import { EventEmitter } from 'events';
import { RPCError } from './RPCError';

export interface IRequestArguments {
  method: string;
  params?: unknown[] | object;
}

export interface IBaseProvider {
  request<T>(args: IRequestArguments): Promise<T>;
  getNetwork(): string;
}

export abstract class BaseProvider extends EventEmitter implements IBaseProvider {
  protected chainId: string | undefined;
  protected rpcUrl: string;
  protected address: string | undefined;

  constructor(rpcUrl: string, chainId?: string) {
    super();
    this.rpcUrl = rpcUrl;
    this.chainId = chainId;
  }

  abstract getNetwork(): string;

  async request<T>(args: IRequestArguments): Promise<T> {
    try {
      const result = await this.handleRequest(args);
      this.emit('response', args, result);
      return result as T;
    } catch (error) {
      const rpcError = RPCError.fromError(error);
      this.emit('error', rpcError);
      throw rpcError;
    }
  }

  protected abstract handleRequest(args: IRequestArguments): Promise<unknown>;

  getChainId(): string | undefined {
    return this.chainId;
  }

  setChainId(chainId: string): void {
    this.chainId = chainId;
  }

  getAddress(): string | undefined {
    return this.address;
  }

  setAddress(address: string): void {
    this.address = address;
  }

  getRpcUrl(): string {
    return this.rpcUrl;
  }

  setRpcUrl(rpcUrl: string): void {
    this.rpcUrl = rpcUrl;
  }
}
