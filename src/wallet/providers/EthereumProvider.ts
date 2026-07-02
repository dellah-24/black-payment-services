/**
 * Ethereum Provider
 * Inspired by Trust Wallet's EthereumProvider pattern
 */

import { BaseProvider, IRequestArguments } from './BaseProvider';
import { RPCError } from './RPCError';

export class EthereumProvider extends BaseProvider {
  static NETWORK = 'ethereum';

  constructor(rpcUrl: string, chainId?: string) {
    super(rpcUrl, chainId);
  }

  getNetwork(): string {
    return EthereumProvider.NETWORK;
  }

  protected async handleRequest(args: IRequestArguments): Promise<unknown> {
    const { method, params } = args;

    switch (method) {
      case 'eth_chainId':
        return this.chainId || '0x1';

      case 'net_version':
        return this.chainId ? parseInt(this.chainId) : 1;

      case 'eth_accounts':
      case 'eth_requestAccounts':
        return this.address ? [this.address] : [];

      case 'eth_blockNumber':
      case 'eth_getBalance':
      case 'eth_sendTransaction':
      case 'eth_call':
      case 'eth_estimateGas':
      case 'eth_getTransactionCount':
      case 'eth_getTransactionReceipt':
      case 'eth_getBlockByNumber':
      case 'eth_getBlockByHash':
      case 'eth_getTransactionByHash':
      case 'eth_getLogs':
      case 'eth_subscribe':
      case 'eth_unsubscribe':
      case 'eth_sign':
      case 'eth_signTransaction':
      case 'eth_sendRawTransaction':
      case 'personal_sign':
      case 'wallet_switchEthereumChain':
      case 'wallet_addEthereumChain':
      case 'wallet_watchAsset':
        // Delegate to RPC server
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
