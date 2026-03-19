/**
 * WalletConnect Module
 * Provides dApp connectivity using WalletConnect v2
 */

import { ethers, BrowserProvider, Signer } from 'ethers';

export type WalletConnectChainId = 
  | 'eip155:1'   // Ethereum
  | 'eip155:56'   // BSC
  | 'eip155:137'  // Polygon
  | 'eip155:42161' // Arbitrum
  | 'eip155:10'   // Optimism
  | 'eip155:43114' // Avalanche
  | 'eip155:8453' // Base
  | 'eip155:59144' // Linea
  | 'eip155:42220' // Celo
  | 'tron';

export interface WalletConnectSession {
  topic: string;
  peer: {
    name: string;
    url: string;
    icons: string[];
  };
  chains: WalletConnectChainId[];
  expiry: number;
}

export interface WalletConnectRequest {
  id: number;
  method: string;
  params: unknown[];
}

/**
 * WalletConnect Provider Events
 */
export type WalletConnectEventType = 
  | 'session_proposal'
  | 'session_approved'
  | 'session_rejected'
  | 'session_disconnected'
  | 'chain_changed'
  | 'accounts_changed'
  | 'display_uri'
  | 'connect'
  | 'disconnect'
  | 'call_request';

export interface WalletConnectEvent {
  type: WalletConnectEventType;
  data: unknown;
}

/**
 * WalletConnect Provider
 */
export class WalletConnectProvider {
  private static instance: WalletConnectProvider;
  private session: WalletConnectSession | null = null;
  private provider: BrowserProvider | null = null;
  private signer: Signer | null = null;
  private eventListeners: ((event: WalletConnectEvent) => void)[] = [];
  private projectId: string = '';
  private relayUrl: string = 'wss://relay.walletconnect.com';

  private constructor() {}

  static getInstance(): WalletConnectProvider {
    if (!WalletConnectProvider.instance) {
      WalletConnectProvider.instance = new WalletConnectProvider();
    }
    return WalletConnectProvider.instance;
  }

  /**
   * Initialize with project ID
   */
  initialize(projectId: string): void {
    this.projectId = projectId;
  }

  /**
   * Add event listener
   */
  addEventListener(listener: (event: WalletConnectEvent) => void): void {
    this.eventListeners.push(listener);
  }

  /**
   * Remove event listener
   */
  removeEventListener(listener: (event: WalletConnectEvent) => void): void {
    this.eventListeners = this.eventListeners.filter(l => l !== listener);
  }

  /**
   * Emit event
   */
  private emit(type: WalletConnectEventType, data: unknown): void {
    const event: WalletConnectEvent = { type, data };
    this.eventListeners.forEach(listener => listener(event));
  }

  /**
   * Generate QR code URI
   */
  async generateURI(): Promise<string> {
    if (!this.projectId) {
      throw new Error('WalletConnect not initialized. Call initialize() first.');
    }

    // Generate a random topic for the session
    const topic = this.generateRandomKey();
    const random = this.generateRandomKey();
    
    // Create the WalletConnect URI
    const uri = `wc:${topic}@2?relay-protocol=websocket&rpcEndpoint=wss://relay.walletconnect.com&projectId=${this.projectId}&random=${random}`;
    
    this.emit('display_uri', { uri });
    return uri;
  }

  /**
   * Connect to a dApp
   */
  async connect(): Promise<string> {
    const uri = await this.generateURI();
    
    // In a real implementation, this would open a modal/QR scanner
    // For now, we'll return the URI
    return uri;
  }

  /**
   * Approve session (after user confirms)
   */
  async approveSession(params: {
    chains: WalletConnectChainId[];
    accounts: string[];
  }): Promise<void> {
    // In a real implementation, this would create the session
    this.session = {
      topic: this.generateRandomKey(),
      peer: {
        name: 'BlackPayments Wallet',
        url: 'https://blackpayments.app',
        icons: [],
      },
      chains: params.chains,
      expiry: Date.now() + 7 * 24 * 60 * 60 * 1000, // 7 days
    };

    // Create ethers provider
    this.provider = new BrowserProvider((window as any).ethereum);
    
    this.emit('session_approved', this.session);
    this.emit('connect', { accounts: params.accounts });
  }

  /**
   * Reject session
   */
  async rejectSession(): void {
    this.emit('session_rejected', { reason: 'User rejected' });
  }

  /**
   * Disconnect
   */
  async disconnect(): Promise<void> {
    this.session = null;
    this.provider = null;
    this.signer = null;
    this.emit('session_disconnected', {});
    this.emit('disconnect', {});
  }

  /**
   * Get connected accounts
   */
  async getAccounts(): Promise<string[]> {
    if (!this.provider) {
      return [];
    }
    
    const accounts = await this.provider.listAccounts();
    return accounts.map(a => a.address);
  }

  /**
   * Get signer
   */
  getSigner(): Signer | null {
    return this.signer;
  }

  /**
   * Send transaction
   */
  async sendTransaction(params: {
    to: string;
    value?: bigint;
    data?: string;
    chainId?: number;
  }): Promise<string> {
    if (!this.provider) {
      throw new Error('Not connected');
    }

    const signer = await this.provider.getSigner();
    const tx = await signer.sendTransaction({
      to: params.to,
      value: params.value ? ethers.toBigInt(params.value) : undefined,
      data: params.data,
    });

    return tx.hash;
  }

  /**
   * Sign message
   */
  async signMessage(message: string): Promise<string> {
    if (!this.provider) {
      throw new Error('Not connected');
    }

    const signer = await this.provider.getSigner();
    return await signer.signMessage(message);
  }

  /**
   * Sign typed data
   */
  async signTypedData(domain: unknown, types: unknown, value: unknown): Promise<string> {
    if (!this.provider) {
      throw new Error('Not connected');
    }

    const signer = await this.provider.getSigner();
    return await signer.signTypedData(domain, types, value);
  }

  /**
   * Switch chain
   */
  async switchChain(chainId: string): Promise<void> {
    // Request chain switch via WalletConnect
    this.emit('chain_changed', { chainId });
  }

  /**
   * Get current session
   */
  getSession(): WalletConnectSession | null {
    return this.session;
  }

  /**
   * Check if connected
   */
  isConnected(): boolean {
    return !!this.session;
  }

  /**
   * Generate random key
   */
  private generateRandomKey(): string {
    const array = new Uint8Array(32);
    crypto.getRandomValues(array);
    return Array.from(array).map(b => b.toString(16).padStart(2, '0')).join('');
  }

  /**
   * Format chain ID to WalletConnect format
   */
  static formatChainId(chainId: number, namespace: string = 'eip155'): string {
    return `${namespace}:${chainId}`;
  }

  /**
   * Parse chain ID from WalletConnect format
   */
  static parseChainId(chainId: string): number {
    const parts = chainId.split(':');
    return parseInt(parts[parts.length - 1], 10);
  }

  /**
   * Get supported chains
   */
  getSupportedChains(): { id: WalletConnectChainId; name: string; chainId: number }[] {
    return [
      { id: 'eip155:1', name: 'Ethereum', chainId: 1 },
      { id: 'eip155:56', name: 'BNB Chain', chainId: 56 },
      { id: 'eip155:137', name: 'Polygon', chainId: 137 },
      { id: 'eip155:42161', name: 'Arbitrum', chainId: 42161 },
      { id: 'eip155:10', name: 'Optimism', chainId: 10 },
      { id: 'eip155:43114', name: 'Avalanche', chainId: 43114 },
      { id: 'eip155:8453', name: 'Base', chainId: 8453 },
      { id: 'eip155:59144', name: 'Linea', chainId: 59144 },
      { id: 'eip155:42220', name: 'Celo', chainId: 42220 },
    ];
  }
}

export const walletConnect = WalletConnectProvider.getInstance();
