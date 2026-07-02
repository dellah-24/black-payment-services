/**
 * Aptos Provider
 * Inspired by Trust Wallet's Aptos provider pattern
 */

import { BaseProvider, IRequestArguments } from './BaseProvider';
import { RPCError } from './RPCError';

export class AptosProvider extends BaseProvider {
  static NETWORK = 'aptos';

  constructor(rpcUrl: string, chainId?: string) {
    super(rpcUrl, chainId);
  }

  getNetwork(): string {
    return AptosProvider.NETWORK;
  }

  protected async handleRequest(args: IRequestArguments): Promise<unknown> {
    const { method, params } = args;

    switch (method) {
      case 'aptos_chainId':
        return this.chainId || '1';

      case 'aptos_networkVersion':
      case 'aptos_net_version':
        return this.chainId || 'mainnet';

      case 'aptos_accounts':
      case 'aptos_requestAccounts':
        return this.address ? [this.address] : [];

      case 'aptos_getBalance':
      case 'aptos_getTransaction':
      case 'aptos_sendTransaction':
      case 'aptos_signTransaction':
      case 'aptos_signMessage':
      case 'aptos_initialize':
      case 'aptos_disconnect':
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
