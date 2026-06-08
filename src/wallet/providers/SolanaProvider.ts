/**
 * Solana Provider
 * Inspired by Trust Wallet's Solana provider pattern
 */

import { BaseProvider, IRequestArguments } from './BaseProvider';
import { RPCError } from './RPCError';

export class SolanaProvider extends BaseProvider {
  static NETWORK = 'solana';

  constructor(rpcUrl: string, chainId?: string) {
    super(rpcUrl, chainId);
  }

  getNetwork(): string {
    return SolanaProvider.NETWORK;
  }

  protected async handleRequest(args: IRequestArguments): Promise<unknown> {
    const { method, params } = args;

    switch (method) {
      case 'solana_chainId':
        return this.chainId || '0x65';

      case 'solana_networkVersion':
      case 'solana_net_version':
        return this.chainId || 'mainnet-beta';

      case 'solana_accounts':
      case 'solana_requestAccounts':
        return this.address ? [this.address] : [];

      case 'solana_getBalance':
      case 'solana_getTokenAccountsByOwner':
      case 'solana_getTokenAccountBalance':
      case 'solana_getTransaction':
      case 'solana_getTransactionSignature':
      case 'solana_sendTransaction':
      case 'solana_signTransaction':
      case 'solana_signMessage':
      case 'solana_signAllTransactions':
      case 'solana_initialize':
      case 'solana_disconnect':
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

  setAddress(address: string): void {
    this.address = address;
    this.emit('accountsChanged', [address]);
  }

  setChainId(chainId: string): void {
    this.chainId = chainId;
    this.emit('chainChanged', chainId);
  }
}
