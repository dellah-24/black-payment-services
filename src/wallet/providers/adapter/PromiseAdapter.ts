/**
 * Promise Adapter
 * Inspired by Trust Wallet's adapter pattern
 */

import { Adapter, AdapterStrategy } from './Adapter';

export class PromiseAdapter extends Adapter {
  getStrategy(): AdapterStrategy {
    return AdapterStrategy.PROMISE;
  }

  async request(args: { method: string; params?: unknown[] | object }, network: string): Promise<unknown> {
    // Promise-based request implementation
    // This can be extended to support different transport mechanisms
    return { method: args.method, params: args.params, network };
  }
}
