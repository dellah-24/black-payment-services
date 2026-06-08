/**
 * Callback Adapter
 * Inspired by Trust Wallet's adapter pattern
 */

import { Adapter, AdapterStrategy } from './Adapter';

export type ResponseCallback = (requestId: number, response: unknown) => void;
export type ErrorCallback = (requestId: number, error: unknown) => void;

export class CallbackAdapter extends Adapter {
  private responseCallback?: ResponseCallback;
  private errorCallback?: ErrorCallback;

  getStrategy(): AdapterStrategy {
    return AdapterStrategy.CALLBACK;
  }

  setCallbacks(responseCallback: ResponseCallback, errorCallback: ErrorCallback): void {
    this.responseCallback = responseCallback;
    this.errorCallback = errorCallback;
  }

  async request(args: { method: string; params?: unknown[] | object }, network: string): Promise<unknown> {
    // Callback-based request implementation
    return new Promise((resolve, reject) => {
      const requestId = Date.now() + Math.floor(Math.random() * 1000);

      if (this.responseCallback) {
        this.responseCallback(requestId, { method: args.method, params: args.params, network });
      }

      // For now, resolve with a placeholder
      // In a real implementation, this would wait for the callback response
      resolve({ method: args.method, params: args.params, network, requestId });
    });
  }

  sendResponse(requestId: number, response: unknown): void {
    if (this.responseCallback) {
      this.responseCallback(requestId, response);
    }
  }

  sendError(requestId: number, error: unknown): void {
    if (this.errorCallback) {
      this.errorCallback(requestId, error);
    }
  }
}
