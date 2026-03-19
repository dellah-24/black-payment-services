/**
 * DApp Browser Module
 * Built-in decentralized application browser for Web3 interactions
 */

import { ethers, BrowserProvider } from 'ethers';

export interface DApp {
  id: string;
  name: string;
  url: string;
  description: string;
  category: 'defi' | 'nft' | 'games' | 'social' | 'tools';
  icon: string;
  featured: boolean;
}

export interface BrowserTab {
  id: string;
  url: string;
  title: string;
  favicon?: string;
  canGoBack: boolean;
  canGoForward: boolean;
  isLoading: boolean;
}

export interface Web3Connection {
  isConnected: boolean;
  chainId?: number;
  account?: string;
}

/**
 * DApp Browser
 */
export class DAppBrowser {
  private static instance: DAppBrowser;
  private tabs: BrowserTab[] = [];
  private activeTabId: string | null = null;
  private provider: BrowserProvider | null = null;
  private connectedDApp: string | null = null;
  private onTabUpdate: ((tabs: BrowserTab[]) => void) | null = null;
  private onConnectionUpdate: ((connection: Web3Connection) => void) | null = null;

  // Featured dApps
  private featuredDApps: DApp[] = [
    {
      id: 'uniswap',
      name: 'Uniswap',
      url: 'https://app.uniswap.org',
      description: 'Decentralized trading protocol',
      category: 'defi',
      icon: '🦄',
      featured: true,
    },
    {
      id: 'opensea',
      name: 'OpenSea',
      url: 'https://opensea.io',
      description: 'NFT Marketplace',
      category: 'nft',
      icon: '🌊',
      featured: true,
    },
    {
      id: 'aave',
      name: 'Aave',
      url: 'https://app.aave.com',
      description: 'Lending Protocol',
      category: 'defi',
      icon: '👻',
      featured: true,
    },
    {
      id: 'compound',
      name: 'Compound',
      url: 'https://app.compound.finance',
      description: 'Algorithmic Money Market',
      category: 'defi',
      icon: '💚',
      featured: false,
    },
    {
      id: 'curve',
      name: 'Curve',
      url: 'https://curve.fi',
      description: 'Stablecoin DEX',
      category: 'defi',
      icon: '〰️',
      featured: true,
    },
    {
      id: 'blur',
      name: 'Blur',
      url: 'https://blur.io',
      description: 'NFT Marketplace',
      category: 'nft',
      icon: '👁️',
      featured: false,
    },
    {
      id: 'looksrare',
      name: 'LooksRare',
      url: 'https://looksrare.org',
      description: 'NFT Marketplace',
      category: 'nft',
      icon: '👀',
      featured: false,
    },
    {
      id: 'pancakeswap',
      name: 'PancakeSwap',
      url: 'https://pancakeswap.finance',
      description: 'DEX on BNB Chain',
      category: 'defi',
      icon: '🥞',
      featured: true,
    },
    {
      id: 'gitcoin',
      name: 'Gitcoin',
      url: 'https://gitcoin.co',
      description: 'Open Source Funding',
      category: 'social',
      icon: '🌱',
      featured: false,
    },
    {
      id: 'snapshot',
      name: 'Snapshot',
      url: 'https://snapshot.org',
      description: 'DAO Voting',
      category: 'social',
      icon: '📸',
      featured: false,
    },
  ];

  private constructor() {}

  static getInstance(): DAppBrowser {
    if (!DAppBrowser.instance) {
      DAppBrowser.instance = new DAppBrowser();
    }
    return DAppBrowser.instance;
  }

  /**
   * Initialize the browser
   */
  async initialize(): Promise<void> {
    if (typeof window !== 'undefined' && window.ethereum) {
      this.provider = new BrowserProvider(window.ethereum as any);
    }
  }

  /**
   * Set callback for tab updates
   */
  setTabUpdateCallback(callback: (tabs: BrowserTab[]) => void): void {
    this.onTabUpdate = callback;
  }

  /**
   * Set callback for connection updates
   */
  setConnectionCallback(callback: (connection: Web3Connection) => void): void {
    this.onConnectionUpdate = callback;
  }

  /**
   * Get featured dApps
   */
  getFeaturedDApps(): DApp[] {
    return this.featuredDApps.filter(d => d.featured);
  }

  /**
   * Get dApps by category
   */
  getDAppsByCategory(category: DApp['category']): DApp[] {
    return this.featuredDApps.filter(d => d.category === category);
  }

  /**
   * Search dApps
   */
  searchDApps(query: string): DApp[] {
    const lowerQuery = query.toLowerCase();
    return this.featuredDApps.filter(d => 
      d.name.toLowerCase().includes(lowerQuery) ||
      d.description.toLowerCase().includes(lowerQuery)
    );
  }

  /**
   * Get all dApps
   */
  getAllDApps(): DApp[] {
    return this.featuredDApps;
  }

  /**
   * Create a new tab
   */
  createTab(url?: string): BrowserTab {
    const tab: BrowserTab = {
      id: crypto.randomUUID(),
      url: url || 'https://blackpayments.app',
      title: 'New Tab',
      canGoBack: false,
      canGoForward: false,
      isLoading: false,
    };

    this.tabs.push(tab);
    this.activeTabId = tab.id;
    this.notifyTabUpdate();
    
    return tab;
  }

  /**
   * Close a tab
   */
  closeTab(tabId: string): void {
    const index = this.tabs.findIndex(t => t.id === tabId);
    if (index === -1) return;

    this.tabs.splice(index, 1);

    if (this.activeTabId === tabId) {
      this.activeTabId = this.tabs[Math.max(0, index - 1)]?.id || null;
    }

    this.notifyTabUpdate();
  }

  /**
   * Get active tab
   */
  getActiveTab(): BrowserTab | null {
    return this.tabs.find(t => t.id === this.activeTabId) || null;
  }

  /**
   * Set active tab
   */
  setActiveTab(tabId: string): void {
    if (this.tabs.find(t => t.id === tabId)) {
      this.activeTabId = tabId;
      this.notifyTabUpdate();
    }
  }

  /**
   * Get all tabs
   */
  getTabs(): BrowserTab[] {
    return this.tabs;
  }

  /**
   * Update tab URL (simulated - in production would use WebView)
   */
  updateTab(tabId: string, updates: Partial<BrowserTab>): void {
    const tab = this.tabs.find(t => t.id === tabId);
    if (tab) {
      Object.assign(tab, updates);
      this.notifyTabUpdate();
    }
  }

  /**
   * Connect to dApp (request account access)
   */
  async connectToDApp(): Promise<string | null> {
    if (!this.provider) {
      throw new Error('No provider available');
    }

    try {
      const accounts = await this.provider.send('eth_requestAccounts', []);
      this.connectedDApp = accounts[0];
      
      const network = await this.provider.getNetwork();
      
      this.onConnectionUpdate?.({
        isConnected: true,
        chainId: Number(network.chainId),
        account: accounts[0],
      });

      return accounts[0];
    } catch (error) {
      console.error('Failed to connect:', error);
      return null;
    }
  }

  /**
   * Disconnect from dApp
   */
  disconnectFromDApp(): void {
    this.connectedDApp = null;
    this.onConnectionUpdate?.({
      isConnected: false,
    });
  }

  /**
   * Get current connection
   */
  async getConnection(): Promise<Web3Connection> {
    if (!this.provider) {
      return { isConnected: false };
    }

    try {
      const accounts = await this.provider.listAccounts();
      const network = await this.provider.getNetwork();
      
      return {
        isConnected: accounts.length > 0,
        chainId: Number(network.chainId),
        account: accounts[0]?.address,
      };
    } catch {
      return { isConnected: false };
    }
  }

  /**
   * Switch chain
   */
  async switchChain(chainId: number): Promise<void> {
    if (!this.provider) {
      throw new Error('No provider available');
    }

    const chainIdHex = `0x${chainId.toString(16)}`;

    try {
      await this.provider.send('wallet_switchEthereumChain', [{ chainId: chainIdHex }]);
    } catch (error: any) {
      // Chain not added, need to add it
      if (error.code === 4902) {
        throw new Error(`Chain ${chainId} not configured. Please add it manually.`);
      }
      throw error;
    }
  }

  /**
   * Add chain to wallet
   */
  async addChain(chainParams: {
    chainId: string;
    chainName: string;
    nativeCurrency: {
      name: string;
      symbol: string;
      decimals: number;
    };
    rpcUrls: string[];
    blockExplorerUrls?: string[];
  }): Promise<void> {
    if (!this.provider) {
      throw new Error('No provider available');
    }

    await this.provider.send('wallet_addEthereumChain', [chainParams]);
  }

  /**
   * Sign message
   */
  async signMessage(message: string): Promise<string> {
    if (!this.provider) {
      throw new Error('No provider available');
    }

    const signer = await this.provider.getSigner();
    return signer.signMessage(message);
  }

  /**
   * Sign transaction
   */
  async signTransaction(tx: {
    to: string;
    value?: bigint;
    data?: string;
  }): Promise<string> {
    if (!this.provider) {
      throw new Error('No provider available');
    }

    const signer = await this.provider.getSigner();
    const populatedTx = await signer.populateTransaction({
      to: tx.to,
      value: tx.value,
      data: tx.data,
    });

    const signedTx = await signer.signTransaction(populatedTx);
    return signedTx;
  }

  /**
   * Send transaction
   */
  async sendTransaction(tx: {
    to: string;
    value?: bigint;
    data?: string;
  }): Promise<string> {
    if (!this.provider) {
      throw new Error('No provider available');
    }

    const signer = await this.provider.getSigner();
    const response = await signer.sendTransaction({
      to: tx.to,
      value: tx.value,
      data: tx.data,
    });

    return response.hash;
  }

  /**
   * Notify tab update
   */
  private notifyTabUpdate(): void {
    this.onTabUpdate?.(this.tabs);
  }

  /**
   * Get chain info
   */
  static getChainInfo(chainId: number): { name: string; symbol: string; explorer: string } | null {
    const chains: Record<number, { name: string; symbol: string; explorer: string }> = {
      1: { name: 'Ethereum', symbol: 'ETH', explorer: 'https://etherscan.io' },
      56: { name: 'BNB Chain', symbol: 'BNB', explorer: 'https://bscscan.com' },
      137: { name: 'Polygon', symbol: 'MATIC', explorer: 'https://polygonscan.com' },
      42161: { name: 'Arbitrum', symbol: 'ETH', explorer: 'https://arbiscan.io' },
      10: { name: 'Optimism', symbol: 'ETH', explorer: 'https://optimistic.etherscan.io' },
      43114: { name: 'Avalanche', symbol: 'AVAX', explorer: 'https://snowtrace.io' },
      8453: { name: 'Base', symbol: 'ETH', explorer: 'https://basescan.org' },
    };

    return chains[chainId] || null;
  }
}

export const dAppBrowser = DAppBrowser.getInstance();
