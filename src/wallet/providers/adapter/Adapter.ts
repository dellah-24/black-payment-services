/**
 * Adapter Strategy
 * Inspired by Trust Wallet's adapter pattern
 */

export enum AdapterStrategy {
  CALLBACK = 'callback',
  PROMISE = 'promise',
}

export interface IAdapter {
  request(args: { method: string; params?: unknown[] | object }, network: string): Promise<unknown>;
  getStrategy(): AdapterStrategy;
}

export abstract class Adapter implements IAdapter {
  abstract request(args: { method: string; params?: unknown[] | object }, network: string): Promise<unknown>;
  abstract getStrategy(): AdapterStrategy;
}
