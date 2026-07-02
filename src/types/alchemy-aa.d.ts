/**
 * Type declarations for optional @alchemy/aa-alchemy package
 * This package is optional and may not be installed
 */
declare module '@alchemy/aa-alchemy' {
  export function createSmartAccountClient(config: any): Promise<any>;
  export function createLightAccountClient(config: any): Promise<any>;
}

declare module 'alchemy' {
  export class Alchemy {
    constructor(config: { apiKey: string; network: string });
  }
}