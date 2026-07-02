/**
 * Cosmos Provider
 * Inspired by Trust Wallet's Cosmos provider pattern
 */

import { BaseProvider, IRequestArguments } from './BaseProvider';
import { RPCError } from './RPCError';

export class CosmosProvider extends BaseProvider {
  static NETWORK = 'cosmos';

  constructor(rpcUrl: string, chainId?: string) {
    super(rpcUrl, chainId);
  }

  getNetwork(): string {
    return CosmosProvider.NETWORK;
  }

  protected async handleRequest(args: IRequestArguments): Promise<unknown> {
    const { method, params } = args;

    switch (method) {
      case 'cosmos_chainId':
        return this.chainId || 'cosmoshub-4';

      case 'cosmos_networkVersion':
      case 'cosmos_net_version':
        return this.chainId || 'cosmoshub-4';

      case 'cosmos_accounts':
      case 'cosmos_requestAccounts':
        return this.address ? [this.address] : [];

      case 'cosmos_getBalance':
      case 'cosmos_getTransaction':
      case 'cosmos_sendTransaction':
      case 'cosmos_signTransaction':
      case 'cosmos_signMessage':
      case 'cosmos_initialize':
      case 'cosmos_disconnect':
        return this.rpcCall(method, params);

      default:
        throw RPCError.unsupportedMethod(method);
    }
  }

  private async rpcCall(method: string, params?: unknown[] | object): Promise<unknown> {
    const response = await fetch(this.rpcUrl, {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: Date.now() + Math.floor(Math.random() * 1000),
        method,
        params: params || [],
      }),
    });

    const json = await response.json();

    if (json.error) {
      throw new RPCError(json.error.code || -32603, json.error.message || 'RPC error', json.error.data);
    }

    return json.result;
  }

  override setAddress(address: string): void {
    this.address = address;
    this.emit('accountsChanged', [address]);
  }

  override setChainId(chainId: string): void {
    this.chainId = chainId;
    this.emit('chainChanged', chainId);
  }
}
