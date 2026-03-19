/**
 * Token Swap Module
 * Provides token swapping via 1inch aggregator
 */

import { ethers } from 'ethers';

export type SwapChainId = 
  | 1    // Ethereum
  | 56   // BSC
  | 137  // Polygon
  | 42161 // Arbitrum
  | 10   // Optimism
  | 43114 // Avalanche
  | 8453 // Base
  | 59144 // Linea
  | 42220; // Celo

export interface Token {
  address: string;
  symbol: string;
  name: string;
  decimals: number;
  logoURI?: string;
  chainId: SwapChainId;
}

export interface SwapQuote {
  fromToken: Token;
  toToken: Token;
  fromAmount: bigint;
  toAmount: bigint;
  toAmountMin: bigint; // Minimum guaranteed with slippage
  estimatedGas: bigint;
  protocol: string;
  route: string[];
  priceImpact: number; // percentage
}

export interface SwapResult {
  hash: string;
  fromToken: Token;
  toToken: Token;
  fromAmount: bigint;
  toAmount: bigint;
  status: 'pending' | 'confirmed' | 'failed';
  timestamp: Date;
}

/**
 * Swap Module
 */
export class TokenSwap {
  private static instance: TokenSwap;
  private apiUrl = 'https://api.1inch.io/v5.0';
  private privateKey: string | null = null;
  private provider: ethers.JsonRpcProvider | null = null;
  private chainProviders: Record<SwapChainId, string> = {
    1: 'https://eth.llamarpc.com',
    56: 'https://bsc-dataseed.binance.org',
    137: 'https://polygon-rpc.com',
    42161: 'https://arb1.arbitrum.io/rpc',
    10: 'https://mainnet.optimism.io',
    43114: 'https://api.avax.network/ext/bc/C/rpc',
    8453: 'https://base-mainnet.g.alchemy.com/v2/demo',
    59144: 'https://rpc.linea.build',
    42220: 'https://forno.celo.org',
  };

  // Common tokens
  private tokens: Record<SwapChainId, Token[]> = {
    1: [
      { address: '0x0000000000000000000000000000000000000000', symbol: 'ETH', name: 'Ethereum', decimals: 18, chainId: 1 },
      { address: '0xdAC17F958D2ee523a2206206994597C13D831ec7', symbol: 'USDT', name: 'Tether USD', decimals: 6, chainId: 1 },
      { address: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48', symbol: 'USDC', name: 'USD Coin', decimals: 6, chainId: 1 },
      { address: '0x6B175474E89094C44Da98b954EesadcdEF9ce6CC', symbol: 'DAI', name: 'Dai Stablecoin', decimals: 18, chainId: 1 },
      { address: '0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599', symbol: 'WBTC', name: 'Wrapped Bitcoin', decimals: 8, chainId: 1 },
    ],
    56: [
      { address: '0x0000000000000000000000000000000000000000', symbol: 'BNB', name: 'BNB', decimals: 18, chainId: 56 },
      { address: '0x55d398326f99059fF775485246999027B3197955', symbol: 'USDT', name: 'Tether USD', decimals: 6, chainId: 56 },
      { address: '0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d', symbol: 'USDC', name: 'USD Coin', decimals: 18, chainId: 56 },
      { address: '0xe9e7CEA3DedcA5984780Bafc599bD69ADd087D56', symbol: 'BUSD', name: 'Binance USD', decimals: 18, chainId: 56 },
    ],
    137: [
      { address: '0x0000000000000000000000000000000000000000', symbol: 'MATIC', name: 'Polygon', decimals: 18, chainId: 137 },
      { address: '0xc2132D05D31c914a87C6611C10748AEb04B58e8F', symbol: 'USDT', name: 'Tether USD', decimals: 6, chainId: 137 },
      { address: '0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174', symbol: 'USDC', name: 'USD Coin', decimals: 6, chainId: 137 },
    ],
    42161: [
      { address: '0x0000000000000000000000000000000000000000', symbol: 'ETH', name: 'Ethereum', decimals: 18, chainId: 42161 },
      { address: '0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9', symbol: 'USDT', name: 'Tether USD', decimals: 6, chainId: 42161 },
      { address: '0xFF970A61A04b1cA14834A43f5dE4533eBDDB5CC8', symbol: 'USDC', name: 'USD Coin', decimals: 6, chainId: 42161 },
    ],
    10: [
      { address: '0x0000000000000000000000000000000000000000', symbol: 'ETH', name: 'Ethereum', decimals: 18, chainId: 10 },
      { address: '0x94b008aA5d2057d2D4C21e4D8dDAc6E9D48e6b7F', symbol: 'USDT', name: 'Tether USD', decimals: 6, chainId: 10 },
      { address: '0x7F5c764cBc14f9669B88837ca1490cCa17c31607', symbol: 'USDC', name: 'USD Coin', decimals: 6, chainId: 10 },
    ],
    43114: [
      { address: '0x0000000000000000000000000000000000000000', symbol: 'AVAX', name: 'Avalanche', decimals: 18, chainId: 43114 },
      { address: '0x9702230A8Ea53601f5cD2dc4fD0C8c5a4d8C9e8A', symbol: 'USDT', name: 'Tether USD', decimals: 6, chainId: 43114 },
      { address: '0xB97EF9Ef8734C71904D8002F8b6Bc66Dd9c48a6E', symbol: 'USDC', name: 'USD Coin', decimals: 6, chainId: 43114 },
    ],
    8453: [
      { address: '0x0000000000000000000000000000000000000000', symbol: 'ETH', name: 'Ethereum', decimals: 18, chainId: 8453 },
      { address: '0xfde4C96c859A6eF2d517690c79fA43b8B350cA59', symbol: 'USDT', name: 'Tether USD', decimals: 6, chainId: 8453 },
      { address: '0x4ed4e862860bed51a9570b96d89af5e1b0efefed', symbol: 'USDC', name: 'USD Coin', decimals: 6, chainId: 8453 },
    ],
    59144: [
      { address: '0x0000000000000000000000000000000000000000', symbol: 'ETH', name: 'Ethereum', decimals: 18, chainId: 59144 },
      { address: '0xA02f6e711024a65445cA01F2eA52e6D7b11aA07F', symbol: 'USDT', name: 'Tether USD', decimals: 6, chainId: 59144 },
    ],
    42220: [
      { address: '0x0000000000000000000000000000000000000000', symbol: 'CELO', name: 'Celo', decimals: 18, chainId: 42220 },
      { address: '0x765DE816845861e75A25fCA122bb6898B8B1282a', symbol: 'cUSD', name: 'Celo Dollar', decimals: 18, chainId: 42220 },
    ],
  };

  private constructor() {}

  static getInstance(): TokenSwap {
    if (!TokenSwap.instance) {
      TokenSwap.instance = new TokenSwap();
    }
    return TokenSwap.instance;
  }

  /**
   * Initialize with private key
   */
  initialize(privateKey: string, chainId: SwapChainId): void {
    this.privateKey = privateKey;
    const rpcUrl = this.chainProviders[chainId];
    this.provider = new ethers.JsonRpcProvider(rpcUrl);
  }

  /**
   * Get available tokens for a chain
   */
  getTokens(chainId: SwapChainId): Token[] {
    return this.tokens[chainId] || [];
  }

  /**
   * Get token by symbol
   */
  getTokenBySymbol(chainId: SwapChainId, symbol: string): Token | undefined {
    return this.tokens[chainId]?.find(t => t.symbol.toUpperCase() === symbol.toUpperCase());
  }

  /**
   * Get quote for swap
   */
  async getQuote(params: {
    fromToken: string;
    toToken: string;
    amount: bigint;
    chainId: SwapChainId;
    fromAddress?: string;
  }): Promise<SwapQuote> {
    const fromToken = this.getTokenBySymbol(params.chainId, params.fromToken);
    const toToken = this.getTokenBySymbol(params.chainId, params.toToken);
    
    if (!fromToken || !toToken) {
      throw new Error('Token not found');
    }

    // In production, call 1inch API
    // const response = await fetch(
    //   `${this.apiUrl}/${params.chainId}/quote?fromTokenAddress=${fromToken.address}&toTokenAddress=${toToken.address}&amount=${params.amount}`
    // );

    // For demo, calculate mock quote
    const mockToAmount = params.amount * 10000n / 10001n; // ~0.01% slippage
    
    return {
      fromToken,
      toToken,
      fromAmount: params.amount,
      toAmount: mockToAmount,
      toAmountMin: mockToAmount * 99n / 100n, // 1% slippage
      estimatedGas: 150000n,
      protocol: '1inch',
      route: [fromToken.symbol, toToken.symbol],
      priceImpact: 0.01,
    };
  }

  /**
   * Execute swap
   */
  async executeSwap(params: {
    fromToken: string;
    toToken: string;
    amount: bigint;
    chainId: SwapChainId;
    slippage?: number;
  }): Promise<SwapResult> {
    if (!this.privateKey || !this.provider) {
      throw new Error('Swap not initialized');
    }

    const wallet = new ethers.Wallet(this.privateKey, this.provider);
    const fromToken = this.getTokenBySymbol(params.chainId, params.fromToken);
    const toToken = this.getTokenBySymbol(params.chainId, params.toToken);
    
    if (!fromToken || !toToken) {
      throw new Error('Token not found');
    }

    // Get quote first
    const quote = await this.getQuote({
      fromToken: params.fromToken,
      toToken: params.toToken,
      amount: params.amount,
      chainId: params.chainId,
    });

    // Approve token if not native
    if (fromToken.address !== ethers.ZeroAddress) {
      const tokenContract = new ethers.Contract(
        fromToken.address,
        ['function approve(address spender, uint256 amount) returns (bool)'],
        wallet
      );
      
      const allowance = await tokenContract.allowance(wallet.address, '0x1111111254eeb25477b68fb85ed929f73a960582');
      if (allowance < params.amount) {
        const approveTx = await tokenContract.approve('0x1111111254eeb25477b68fb85ed929f73a960582', params.amount);
        await approveTx.wait();
      }
    }

    // Execute swap via 1inch router
    const routerABI = [
      'function swap(address executor, (address srcToken, address dstToken, address srcReceiver, address dstReceiver, uint256 amount, uint256 minReturnAmount, uint256 flags, bytes permit) swapData) returns (uint256 returnAmount)'
    ];

    const router = new ethers.Contract('0x1111111254eeb25477b68fb85ed929f73a960582', routerABI, wallet);
    
    const minReturn = quote.toAmountMin * BigInt(Math.floor((params.slippage || 1) * 100)) / 100n;
    
    const swapData = {
      srcToken: fromToken.address,
      dstToken: toToken.address,
      srcReceiver: wallet.address,
      dstReceiver: wallet.address,
      amount: params.amount,
      minReturnAmount: minReturn,
      flags: 0,
      permit: '0x',
    };

    const tx = await router.swap('0x0000000000000000000000000000000000000000', swapData);
    const receipt = await tx.wait();

    return {
      hash: tx.hash,
      fromToken,
      toToken,
      fromAmount: params.amount,
      toAmount: quote.toAmount,
      status: receipt?.status === 1 ? 'confirmed' : 'failed',
      timestamp: new Date(),
    };
  }

  /**
   * Get swap URL for external swap (Web)
   */
  getSwapUrl(params: {
    fromToken: string;
    toToken: string;
    amount: bigint;
    chainId: SwapChainId;
    fromAddress: string;
  }): string {
    const fromToken = this.getTokenBySymbol(params.chainId, params.fromToken);
    const toToken = this.getTokenBySymbol(params.chainId, params.toToken);
    
    if (!fromToken || !toToken) {
      throw new Error('Token not found');
    }

    const url = new URL('https://app.1inch.io/#/1/swap');
    url.searchParams.set('src', fromToken.address);
    url.searchParams.set('dst', toToken.address);
    url.searchParams.set('amount', params.amount.toString());
    url.searchParams.set('from', params.fromAddress);
    
    return url.toString();
  }

  /**
   * Get supported chains
   */
  getSupportedChains(): { id: SwapChainId; name: string; rpc: string }[] {
    return Object.entries(this.chainProviders).map(([id, rpc]) => ({
      id: parseInt(id) as SwapChainId,
      name: this.getChainName(parseInt(id) as SwapChainId),
      rpc,
    }));
  }

  private getChainName(chainId: SwapChainId): string {
    const names: Record<SwapChainId, string> = {
      1: 'Ethereum',
      56: 'BNB Chain',
      137: 'Polygon',
      42161: 'Arbitrum',
      10: 'Optimism',
      43114: 'Avalanche',
      8453: 'Base',
      59144: 'Linea',
      42220: 'Celo',
    };
    return names[chainId];
  }
}

export const tokenSwap = TokenSwap.getInstance();
