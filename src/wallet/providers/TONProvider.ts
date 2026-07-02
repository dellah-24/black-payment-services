/**
 * TON Provider
 * Inspired by Trust Wallet's TON provider pattern
 */

import { BaseProvider, IRequestArguments } from './BaseProvider';
import { RPCError } from './RPCError';

export class TONProvider extends BaseProvider {
  static NETWORK = 'ton';

  constructor(rpcUrl: string, chainId?: string) {
    super(rpcUrl, chainId);
  }

  getNetwork(): string {
    return TONProvider.NETWORK;
  }

  protected async handleRequest(args: IRequestArguments): Promise<unknown> {
    const { method, params } = args;

    switch (method) {
      case 'ton_chainId':
        return this.chainId || '-239';

      case 'ton_networkVersion':
      case 'ton_net_version':
        return this.chainId || '-239';

      case 'ton_accounts':
      case 'ton_requestAccounts':
        return this.address ? [this.address] : [];

      case 'ton_getBalance':
      case 'ton_getTransaction':
      case 'ton_sendTransaction':
      case 'ton_signTransaction':
      case 'ton_signMessage':
      case 'ton_initialize':
      case 'ton_disconnect':
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
