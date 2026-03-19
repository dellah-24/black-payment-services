/**
 * BlackPayments Wallet - Split Custody Manager
 * 
 * Coordinates hot and cold wallets for secure P2P operations.
 * Implements the G.O.L.D. rule:
 * G - Generate most yield by keeping bulk in cold wallet
 * O - Operate daily trades from hot wallet
 * L - Limit hot wallet to active trading needs
 * D - Double-check addresses and use TRC-20 for low fees
 */

import {
  WalletChain,
  WalletType,
  SplitCustodyConfig,
  CustodyTransfer,
  TransactionResult,
  BalanceResult,
  WhitelistEntry,
  MultiSigRequest,
  EscrowState,
} from './types';
import { USDT_TOKENS } from './chains';
import { HotWallet, HotWalletConfig } from './HotWallet';
import { ColdWallet, ColdWalletConfig } from './ColdWallet';

/**
 * Transfer request between hot and cold wallets
 */
export interface TransferRequest {
  id: string;
  fromType: WalletType;
  toType: WalletType;
  amount: bigint;
  chain: WalletChain;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  txHash?: string;
  timestamp: Date;
  error?: string;
}

/**
 * Complete split custody status
 */
export interface CustodyStatus {
  hotWalletBalances: BalanceResult[];
  coldWalletBalances: BalanceResult[];
  totalUSDT: bigint;
  hotWalletPercentage: number;
  coldWalletPercentage: number;
  pendingTransfers: TransferRequest[];
  needsReplenishment: boolean;
  lastRebalanced?: Date;
}

/**
 * SplitCustodyManager - Manages hot and cold wallet split for P2P operations
 * 
 * This implements the industry-standard "split-custody" approach for P2P exchanges:
 * - Hot Wallet: 5-20% for daily trading operations
 * - Cold Wallet: 80-95% for long-term capital protection
 * 
 * Features:
 * - Automatic rebalancing between wallets
 * - Security whitelisting on both wallets
 * - Multi-sig support for cold wallet
 * - Transaction audit trail
 * - TRC-20 network preference for low fees
 */
export class SplitCustodyManager {
  private hotWallet: HotWallet;
  private coldWallet: ColdWallet;
  private config: SplitCustodyConfig;
  private pendingTransfers: Map<string, TransferRequest>;
  private transferHistory: CustodyTransfer[];
  private lastRebalanced?: Date;
  private escrows: Map<string, EscrowState>;

  /**
   * Create a SplitCustodyManager
   * 
   * @param hotWalletPrivateKey - Private key for hot wallet
   * @param coldWalletPrivateKey - Private key for cold wallet (keep secure!)
   * @param config - Split custody configuration
   * @param isTestnet - Whether to use testnet
   */
  constructor(
    hotWalletPrivateKey: string,
    coldWalletPrivateKey: string,
    config: SplitCustodyConfig,
    isTestnet = false
  ) {
    this.config = config;
    this.pendingTransfers = new Map();
    this.transferHistory = [];
    this.escrows = new Map<string, EscrowState>();

    // Initialize hot wallet
    const hotConfig: HotWalletConfig = {
      maxDailyVolume: config.hotWalletConfig.maxDailyVolume,
      replenishmentThreshold: config.hotWalletConfig.replenishmentThreshold,
      whitelistEnabled: true,
      maxWithdrawalLimit: config.hotWalletConfig.maxDailyVolume / BigInt(10), // 10% of daily volume
      dailyWithdrawalLimit: config.hotWalletConfig.maxDailyVolume,
    };

    this.hotWallet = new HotWallet(
      hotWalletPrivateKey,
      config.hotWalletConfig.chains,
      hotConfig,
      isTestnet
    );

    // Initialize cold wallet
    const coldConfig: ColdWalletConfig = {
      multiSigRequired: config.coldWalletConfig.multiSigRequired || false,
      requiredSignatures: config.coldWalletConfig.signers?.length || 2,
      signerAddresses: config.coldWalletConfig.signers,
      whitelistEnabled: true,
      withdrawalCooldown: 24 * 60 * 60 * 1000, // 24 hour cooldown
      maxWithdrawalAmount: config.hotWalletConfig.maxDailyVolume * BigInt(5), // 5x daily volume max
    };

    this.coldWallet = new ColdWallet(
      coldWalletPrivateKey,
      config.coldWalletConfig.chains,
      coldConfig,
      isTestnet
    );
  }

  /**
   * Initialize both wallets
   */
  async initialize(): Promise<void> {
    await this.hotWallet.initialize();
    await this.coldWallet.initialize();
  }

  /**
   * Get hot wallet instance
   */
  getHotWallet(): HotWallet {
    return this.hotWallet;
  }

  /**
   * Get cold wallet instance
   */
  getColdWallet(): ColdWallet {
    return this.coldWallet;
  }

  /**
   * Get all addresses
   */
  getAllAddresses(): { hot: Record<WalletChain, string>; cold: Record<WalletChain, string> } {
    return {
      hot: this.hotWallet.getAllAddresses(),
      cold: this.coldWallet.getAllAddresses(),
    };
  }

  /**
   * Process a P2P trade from the hot wallet
   * 
   * This is the main function for processing P2P transactions.
   * Uses hot wallet for instant processing.
   */
  async processP2PTrade(
    to: string,
    amount: bigint,
    chain: WalletChain
  ): Promise<TransactionResult> {
    return await this.hotWallet.sendUSDT({
      to,
      amount,
      chain,
    });
  }

  /**
   * Transfer funds from cold to hot wallet (replenishment)
   * 
   * Move funds from cold storage to hot wallet for trading.
   * For cold wallet, this may require multi-sig approval.
   */
  async replenishHotWallet(
    amount: bigint,
    chain: WalletChain
  ): Promise<TransferRequest> {
    const request: TransferRequest = {
      id: `transfer_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      fromType: WalletType.COLD,
      toType: WalletType.HOT,
      amount,
      chain,
      status: 'pending',
      timestamp: new Date(),
    };

    this.pendingTransfers.set(request.id, request);

    try {
      // For cold wallet, we may need multi-sig approval
      if (this.coldWallet.getConfig().multiSigRequired) {
        // Create multi-sig request
        const hotAddress = this.hotWallet.getAddress(chain);
        if (!hotAddress) {
          throw new Error(`Hot wallet not configured for chain ${chain}`);
        }

        const multiSigRequest = this.coldWallet.createMultiSigRequest(
          hotAddress,
          amount,
          chain
        );

        // In production, this would wait for external signatures
        // For now, we'll simulate approval after adding a signature
        this.coldWallet.addSignature(multiSigRequest.id, 'signature_placeholder');
      }

      // Execute transfer from cold to hot
      const result = await this.coldWallet.sendUSDT({
        to: this.hotWallet.getAddress(chain)!,
        amount,
        chain,
      });

      request.status = 'completed';
      request.txHash = result.hash;

      // Add to history
      this.transferHistory.push({
        id: request.id,
        fromType: WalletType.COLD,
        toType: WalletType.HOT,
        amount,
        chain,
        status: 'completed',
        txHash: result.hash,
        timestamp: new Date(),
      });

      this.lastRebalanced = new Date();
    } catch (error) {
      request.status = 'failed';
      request.error = error instanceof Error ? error.message : 'Unknown error';
    }

    return request;
  }

  /**
   * Transfer funds from hot to cold wallet (security deposit)
   * 
   * Move excess funds from hot wallet to cold storage.
   */
  async depositToColdWallet(
    amount: bigint,
    chain: WalletChain
  ): Promise<TransferRequest> {
    const request: TransferRequest = {
      id: `transfer_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      fromType: WalletType.HOT,
      toType: WalletType.COLD,
      amount,
      chain,
      status: 'pending',
      timestamp: new Date(),
    };

    this.pendingTransfers.set(request.id, request);

    try {
      // Execute transfer from hot to cold
      const result = await this.hotWallet.sendUSDT({
        to: this.coldWallet.getAddress(chain)!,
        amount,
        chain,
      });

      request.status = 'completed';
      request.txHash = result.hash;

      // Add to history
      this.transferHistory.push({
        id: request.id,
        fromType: WalletType.HOT,
        toType: WalletType.COLD,
        amount,
        chain,
        status: 'completed',
        txHash: result.hash,
        timestamp: new Date(),
      });
    } catch (error) {
      request.status = 'failed';
      request.error = error instanceof Error ? error.message : 'Unknown error';
    }

    return request;
  }

  /**
   * Auto-rebalance: Check and replenish hot wallet if needed
   * 
   * Following the G.O.L.D. rule:
   * L - Limit the amount in hot wallet to what you need for active trading
   */
  async checkAndRebalance(chain: WalletChain): Promise<{
    rebalanced: boolean;
    action?: string;
    amount?: bigint;
  }> {
    const hotBalance = await this.hotWallet.getUSDTBalance(chain);
    const coldBalance = await this.coldWallet.getUSDTBalance(chain);
    const totalBalance = hotBalance + coldBalance;

    // Check if hot wallet needs replenishment
    if (hotBalance < this.config.hotWalletConfig.replenishmentThreshold) {
      const replenishAmount = this.config.hotWalletConfig.maxDailyVolume - hotBalance;
      
      // Make sure we don't drain cold wallet completely
      if (coldBalance > replenishAmount) {
        await this.replenishHotWallet(replenishAmount, chain);
        return {
          rebalanced: true,
          action: 'replenished',
          amount: replenishAmount,
        };
      }
    }

    // Check if we should move excess to cold wallet
    const rebalanceThreshold = this.config.rebalanceThreshold || 
      (this.config.hotWalletConfig.maxDailyVolume * BigInt(2));

    if (hotBalance > rebalanceThreshold) {
      const excessAmount = hotBalance - this.config.hotWalletConfig.maxDailyVolume;
      
      // Move excess to cold wallet
      await this.depositToColdWallet(excessAmount, chain);
      return {
        rebalanced: true,
        action: 'deposited_to_cold',
        amount: excessAmount,
      };
    }

    return { rebalanced: false };
  }

  /**
   * Get complete custody status
   */
  async getCustodyStatus(chain: WalletChain): Promise<CustodyStatus> {
    const hotBalance = await this.hotWallet.getBalance(chain);
    const coldBalance = await this.coldWallet.getBalance(chain);

    const totalUSDT = hotBalance.usdtBalance + coldBalance.usdtBalance;
    const hotPercentage = totalUSDT > 0n 
      ? (Number(hotBalance.usdtBalance) / Number(totalUSDT)) * 100 
      : 0;
    const coldPercentage = 100 - hotPercentage;

    const pendingTransfers = Array.from(this.pendingTransfers.values())
      .filter(t => t.status === 'pending' || t.status === 'processing');

    return {
      hotWalletBalances: [hotBalance],
      coldWalletBalances: [coldBalance],
      totalUSDT,
      hotWalletPercentage: hotPercentage,
      coldWalletPercentage: coldPercentage,
      pendingTransfers,
      needsReplenishment: hotBalance.usdtBalance < this.config.hotWalletConfig.replenishmentThreshold,
      lastRebalanced: this.lastRebalanced,
    };
  }

  /**
   * Get all balances across all chains
   */
  async getAllBalances(): Promise<{
    hot: BalanceResult[];
    cold: BalanceResult[];
  }> {
    const hotBalances = await this.hotWallet.getAllBalances();
    const coldBalances = await this.coldWallet.getAllBalances();

    return {
      hot: hotBalances,
      cold: coldBalances,
    };
  }

  /**
   * Add whitelisted address to hot wallet
   */
  addHotWalletWhitelist(entry: WhitelistEntry): void {
    this.hotWallet.addToWhitelist(entry);
  }

  /**
   * Add whitelisted address to cold wallet
   */
  addColdWalletWhitelist(entry: WhitelistEntry): void {
    this.coldWallet.addToWhitelist(entry);
  }

  /**
   * Get pending multi-sig requests from cold wallet
   */
  getPendingMultiSigRequests(): MultiSigRequest[] {
    return this.coldWallet.getPendingRequests();
  }

  /**
   * Approve multi-sig request (requires signatures from authorized signers)
   */
  async approveMultiSigRequest(requestId: string, signature: string): Promise<void> {
    this.coldWallet.addSignature(requestId, signature);
  }

  /**
   * Get transfer history
   */
  getTransferHistory(): CustodyTransfer[] {
    return [...this.transferHistory];
  }

  /**
   * Get recommended chain for P2P operations (TRC-20 for low fees)
   * 
   * Following the D in G.O.L.D.: Use TRC-20 network to keep fees low
   */
  getRecommendedChain(): WalletChain {
    return WalletChain.TRON;
  }

  /**
   * Get config
   */
  getConfig(): SplitCustodyConfig {
    return { ...this.config };
  }

  /**
   * Create a new escrow order for P2P trading
   */
  createEscrowOrder(
    seller: string,
    buyer: string,
    amount: bigint,
    price: bigint,
    chain: WalletChain,
    timeoutHours: number = 24
  ): EscrowState {
    const id = `escrow_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const escrow: EscrowState = {
      id,
      terms: {
        id,
        seller,
        buyer,
        amount,
        chain,
        price,
        timeout: Math.floor(Date.now() / 1000) + (timeoutHours * 3600),
        token: USDT_TOKENS[chain].tokenAddress,
        currency: 'USDT'
      },
      status: 'created'
    };
    
    this.escrows.set(id, escrow);
    return escrow;
  }

  /**
   * Fund an escrow (buyer sends payment to escrow)
   */
  async fundEscrow(
    escrowId: string,
    from: string,
    amount: bigint,
    chain: WalletChain
  ): Promise<boolean> {
    const escrow = this.escrows.get(escrowId);
    if (!escrow || escrow.status !== 'created') return false;
    
    // Verify sender is buyer
    if (from.toLowerCase() !== escrow.terms.buyer.toLowerCase()) return false;
    
    // Verify amount matches escrow terms
    if (amount !== escrow.terms.amount) return false;
    
    // Transfer funds from buyer's hot wallet to escrow (held by cold wallet)
    try {
      // For security, escrow funds are held in cold wallet
      const result = await this.hotWallet.sendUSDT({
        to: this.coldWallet.getAddress(chain)!,
        amount,
        chain,
      });
      
      escrow.status = 'funded';
      escrow.fundedAt = Math.floor(Date.now() / 1000);
      
      // Record escrow funding in transfer history
      this.transferHistory.push({
        id: result.hash,
        fromType: WalletType.HOT,
        toType: WalletType.COLD,
        amount,
        chain,
        status: 'completed',
        txHash: result.hash,
        timestamp: new Date(),
      });
      
      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * Release escrow funds to seller (after buyer confirms receipt)
   */
  async releaseEscrow(
    escrowId: string,
    from: string
  ): Promise<boolean> {
    const escrow = this.escrows.get(escrowId);
    if (!escrow || escrow.status !== 'funded') return false;
    
    // Verify sender is seller
    if (from.toLowerCase() !== escrow.terms.seller.toLowerCase()) return false;
    
    // Check if expired
    if (Date.now() / 1000 > escrow.terms.timeout) {
      escrow.status = 'refunded';
      escrow.refundedAt = Math.floor(Date.now() / 1000);
      return false;
    }
    
    // Release funds from escrow (cold wallet) to seller
    try {
      const result = await this.coldWallet.sendUSDT({
        to: escrow.terms.seller,
        amount: escrow.terms.amount,
        chain: escrow.terms.chain,
      });
      
      escrow.status = 'released';
      escrow.releasedAt = Math.floor(Date.now() / 1000);
      
      // Record escrow release in transfer history
      this.transferHistory.push({
        id: result.hash,
        fromType: WalletType.COLD,
        toType: WalletType.HOT,
        amount: escrow.terms.amount,
        chain: escrow.terms.chain,
        status: 'completed',
        txHash: result.hash,
        timestamp: new Date(),
      });
      
      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * Refund escrow funds to buyer (if expired or disputed)
   */
  async refundEscrow(
    escrowId: string,
    from: string
  ): Promise<boolean> {
    const escrow = this.escrows.get(escrowId);
    if (!escrow || !(escrow.status === 'funded' || escrow.status === 'disputed')) return false;
    
    // Verify sender is buyer
    if (from.toLowerCase() !== escrow.terms.buyer.toLowerCase()) return false;
    
    // Refund funds from escrow (cold wallet) to buyer
    try {
      const result = await this.coldWallet.sendUSDT({
        to: escrow.terms.buyer,
        amount: escrow.terms.amount,
        chain: escrow.terms.chain,
      });
      
      escrow.status = 'refunded';
      escrow.refundedAt = Math.floor(Date.now() / 1000);
      
      // Record escrow refund in transfer history
      this.transferHistory.push({
        id: result.hash,
        fromType: WalletType.COLD,
        toType: WalletType.HOT,
        amount: escrow.terms.amount,
        chain: escrow.terms.chain,
        status: 'completed',
        txHash: result.hash,
        timestamp: new Date(),
      });
      
      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * Open a dispute on an escrow
   */
  openDispute(
    escrowId: string,
    from: string,
    reason: string,
    evidence: string
  ): boolean {
    const escrow = this.escrows.get(escrowId);
    if (!escrow || escrow.status !== 'funded') return false;
    
    // Verify sender is either buyer or seller
    const isBuyer = from.toLowerCase() === escrow.terms.buyer.toLowerCase();
    const isSeller = from.toLowerCase() === escrow.terms.seller.toLowerCase();
    if (!isBuyer && !isSeller) return false;
    
    escrow.status = 'disputed';
    escrow.disputedAt = Math.floor(Date.now() / 1000);
    escrow.disputeReason = reason;
    // In production, evidence would be stored on IPFS or similar
    
    return true;
  }

  /**
   * Resolve a disputed escrow (moderator only)
   */
  resolveDispute(
    escrowId: string,
    moderator: string,
    outcome: 'buyer' | 'seller'
  ): boolean {
    const escrow = this.escrows.get(escrowId);
    if (!escrow || escrow.status !== 'disputed') return false;
    
    // In production, verify moderator is authorized
    escrow.moderator = moderator;
    
    if (outcome === 'buyer') {
      // Refund to buyer
      escrow.status = 'refunded';
      escrow.refundedAt = Math.floor(Date.now() / 1000);
    } else {
      // Release to seller
      escrow.status = 'released';
      escrow.releasedAt = Math.floor(Date.now() / 1000);
    }
    
    return true;
  }

  /**
   * Get escrow by ID
   */
  getEscrow(escrowId: string): EscrowState | undefined {
    return this.escrows.get(escrowId);
  }

  /**
   * Get active escrows (created or funded)
   */
  getActiveEscrows(): EscrowState[] {
    return Array.from(this.escrows.values())
      .filter(e => e.status === 'created' || e.status === 'funded');
  }

  /**
   * Get expired escrows
   */
  getExpiredEscrows(): EscrowState[] {
    const now = Math.floor(Date.now() / 1000);
    return Array.from(this.escrows.values())
      .filter(e => e.status === 'funded' && e.terms.timeout < now);
  }
}

/**
 * Factory function to create a SplitCustodyManager with recommended defaults
 */
export function createSplitCustodySystem(
  hotWalletPrivateKey: string,
  coldWalletPrivateKey: string,
  options?: {
    isTestnet?: boolean;
    chains?: WalletChain[];
    maxDailyVolume?: bigint;
  }
): SplitCustodyManager {
  const chains = options?.chains || [WalletChain.TRON, WalletChain.BSC, WalletChain.ETHEREUM];
  const maxDailyVolume = options?.maxDailyVolume || BigInt(100000); // 100,000 USDT default

  const config: SplitCustodyConfig = {
    hotWalletConfig: {
      chains,
      maxDailyVolume,
      replenishmentThreshold: maxDailyVolume / BigInt(4), // 25% of max
    },
    coldWalletConfig: {
      chains,
      multiSigRequired: true,
      signers: [], // Add signer addresses in production
    },
    autoReplenish: true,
    rebalanceThreshold: maxDailyVolume * BigInt(2),
  };

  return new SplitCustodyManager(
    hotWalletPrivateKey,
    coldWalletPrivateKey,
    config,
    options?.isTestnet
  );
}
