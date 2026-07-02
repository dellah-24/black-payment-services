/**
 * Bitcoin Provider
 * Inspired by Trust Wallet's Bitcoin provider pattern
 */

import { BaseProvider, IRequestArguments } from './BaseProvider';
import { RPCError } from './RPCError';

export class BitcoinProvider extends BaseProvider {
  static NETWORK = 'bitcoin';

  constructor(rpcUrl: string, chainId?: string) {
    super(rpcUrl, chainId);
  }

  getNetwork(): string {
    return BitcoinProvider.NETWORK;
  }

  protected async handleRequest(args: IRequestArguments): Promise<unknown> {
    const { method, params } = args;

    switch (method) {
      case 'bitcoin_chainId':
        return this.chainId || '0x0';

      case 'bitcoin_networkVersion':
      case 'bitcoin_net_version':
        return this.chainId || 'mainnet';

      case 'bitcoin_accounts':
      case 'bitcoin_requestAccounts':
        return this.address ? [this.address] : [];

      case 'bitcoin_getBalance':
      case 'bitcoin_getTransaction':
      case 'bitcoin_sendTransaction':
      case 'bitcoin_signTransaction':
      case 'bitcoin_signMessage':
      case 'bitcoin_initialize':
      case 'bitcoin_disconnect':
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
