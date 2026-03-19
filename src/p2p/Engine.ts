/**
 * P2P Trading Engine
 * Handles order matching, escrow, and dispute resolution
 */

import { WalletChain } from '../wallet/types';
import { sha256 } from '../wallet/crypto';

export type OrderStatus = 
  | 'pending' 
  | 'active' 
  | 'partially_filled' 
  | 'filled' 
  | 'cancelled' 
  | 'expired';

export type TradeStatus = 
  | 'created' 
  | 'waiting_payment' 
  | 'paid' 
  | 'released' 
  | 'refunded' 
  | 'disputed' 
  | 'resolved';

export type PaymentMethod = 
  | 'bank_transfer'
  | 'mobile_money'
  | 'cash_deposit'
  | 'paypal'
  | 'wise'
  | 'revolut'
  | 'crypto'
  | 'other';

export type DisputeReason = 
  | 'payment_not_received'
  | 'crypto_not_released'
  | 'wrong_amount'
  | 'fake_proof'
  | 'account_blocked'
  | 'other';

/**
 * P2P Order
 */
export interface P2POrder {
  id: string;
  userId: string;
  type: 'buy' | 'sell';
  token: string; // USDT, USDC, etc.
  chain: WalletChain;
  amount: bigint;
  filledAmount: bigint;
  price: bigint; // Price in fiat (cents)
  fiatCurrency: string;
  paymentMethods: PaymentMethod[];
  minAmount: bigint;
  maxAmount: bigint;
  timeLimit: number; // minutes
  status: OrderStatus;
  terms: string; // Custom terms
  createdAt: number;
  updatedAt: number;
  expiresAt: number;
}

/**
 * P2P Trade
 */
export interface P2PTrade {
  id: string;
  orderId: string;
  makerId: string;
  takerId: string;
  type: 'buy' | 'sell';
  token: string;
  chain: WalletChain;
  amount: bigint;
  price: bigint;
  fiatAmount: bigint;
  fiatCurrency: string;
  paymentMethod: PaymentMethod;
  status: TradeStatus;
  makerPaymentDetails?: string;
  takerPaymentDetails?: string;
  makerConfirmedAt?: number;
  takerConfirmedAt?: number;
  releasedAt?: number;
  createdAt: number;
  updatedAt: number;
  expiresAt: number;
}

/**
 * Dispute
 */
export interface Dispute {
  id: string;
  tradeId: string;
  openedBy: string;
  reason: DisputeReason;
  description: string;
  evidence: string[]; // URLs to evidence
  status: 'open' | 'under_review' | 'maker_wins' | 'taker_wins' | 'cancelled';
  resolution?: string;
  resolvedAt?: number;
  resolvedBy?: string;
  createdAt: number;
  updatedAt: number;
}

/**
 * User profile for P2P
 */
export interface P2PProfile {
  userId: string;
  username: string;
  avatar?: string;
  kycLevel: 0 | 1 | 2 | 3; // 0: none, 1: email, 2: phone, 3: full
  tradeCount: number;
  totalVolume: bigint;
  completionRate: number;
  avgReleaseTime: number; // minutes
  rating: number; // 1-5
  reviewCount: number;
  registeredAt: number;
  lastSeenAt: number;
  isVerified: boolean;
  blockedUsers: string[];
}

/**
 * Trade chat message
 */
export interface ChatMessage {
  id: string;
  tradeId: string;
  senderId: string;
  content: string;
  type: 'text' | 'image' | 'system';
  timestamp: number;
}

/**
 * P2P Engine Events
 */
export type P2PEventType = 
  | 'order_created'
  | 'order_updated'
  | 'order_cancelled'
  | 'order_filled'
  | 'trade_created'
  | 'trade_updated'
  | 'payment_confirmed'
  | 'crypto_released'
  | 'dispute_opened'
  | 'dispute_resolved'
  | 'message_received';

export interface P2PEvent {
  type: P2PEventType;
  data: unknown;
  timestamp: number;
}

/**
 * P2P Orderbook
 */
export interface Orderbook {
  bids: P2POrder[]; // Buy orders (want to buy)
  asks: P2POrder[]; // Sell orders (want to sell)
  spread: bigint;
  midPrice: bigint;
}

/**
 * P2P Engine
 */
export class P2PEngine {
  private static instance: P2PEngine;
  private orders: Map<string, P2POrder> = new Map();
  private trades: Map<string, P2PTrade> = new Map();
  private profiles: Map<string, P2PProfile> = new Map();
  private disputes: Map<string, Dispute> = new Map();
  private chatMessages: Map<string, ChatMessage[]> = new Map();
  private eventListeners: ((event: P2PEvent) => void)[] = [];
  private userId: string | null = null;

  private constructor() {}

  static getInstance(): P2PEngine {
    if (!P2PEngine.instance) {
      P2PEngine.instance = new P2PEngine();
    }
    return P2PEngine.instance;
  }

  /**
   * Set current user
   */
  setUser(userId: string): void {
    this.userId = userId;
  }

  /**
   * Get current user
   */
  getUser(): string | null {
    return this.userId;
  }

  /**
   * Add event listener
   */
  addEventListener(listener: (event: P2PEvent) => void): void {
    this.eventListeners.push(listener);
  }

  /**
   * Remove event listener
   */
  removeEventListener(listener: (event: P2PEvent) => void): void {
    this.eventListeners = this.eventListeners.filter(l => l !== listener);
  }

  /**
   * Emit event
   */
  private emit(type: P2PEventType, data: unknown): void {
    const event: P2PEvent = { type, data, timestamp: Date.now() };
    this.eventListeners.forEach(listener => listener(event));
  }

  /**
   * Create order
   */
  async createOrder(params: {
    type: 'buy' | 'sell';
    token: string;
    chain: WalletChain;
    amount: bigint;
    price: bigint;
    fiatCurrency: string;
    paymentMethods: PaymentMethod[];
    minAmount?: bigint;
    maxAmount?: bigint;
    timeLimit?: number;
    terms?: string;
  }): Promise<P2POrder> {
    if (!this.userId) throw new Error('User not set');

    const now = Date.now();
    const timeLimit = params.timeLimit || 30;
    
    const order: P2POrder = {
      id: await this.generateId(),
      userId: this.userId,
      type: params.type,
      token: params.token,
      chain: params.chain,
      amount: params.amount,
      filledAmount: 0n,
      price: params.price,
      fiatCurrency: params.fiatCurrency,
      paymentMethods: params.paymentMethods,
      minAmount: params.minAmount || params.amount / 10n,
      maxAmount: params.maxAmount || params.amount,
      timeLimit,
      status: 'active',
      terms: params.terms || '',
      createdAt: now,
      updatedAt: now,
      expiresAt: now + timeLimit * 60 * 1000,
    };

    this.orders.set(order.id, order);
    this.emit('order_created', order);
    
    return order;
  }

  /**
   * Update order
   */
  async updateOrder(orderId: string, updates: Partial<Pick<P2POrder, 'price' | 'paymentMethods' | 'minAmount' | 'maxAmount' | 'terms'>>): Promise<P2POrder> {
    const order = this.orders.get(orderId);
    if (!order) throw new Error('Order not found');
    if (order.userId !== this.userId) throw new Error('Not authorized');
    if (order.status !== 'active') throw new Error('Order not active');

    const updatedOrder: P2POrder = {
      ...order,
      ...updates,
      updatedAt: Date.now(),
    };

    this.orders.set(orderId, updatedOrder);
    this.emit('order_updated', updatedOrder);
    
    return updatedOrder;
  }

  /**
   * Cancel order
   */
  async cancelOrder(orderId: string): Promise<void> {
    const order = this.orders.get(orderId);
    if (!order) throw new Error('Order not found');
    if (order.userId !== this.userId) throw new Error('Not authorized');

    order.status = 'cancelled';
    order.updatedAt = Date.now();
    this.orders.set(orderId, order);
    
    this.emit('order_cancelled', order);
  }

  /**
   * Get orderbook for a trading pair
   */
  getOrderbook(token: string, fiatCurrency: string, chain: WalletChain): Orderbook {
    const allOrders = Array.from(this.orders.values())
      .filter(o => 
        o.token === token && 
        o.fiatCurrency === fiatCurrency && 
        o.chain === chain &&
        o.status === 'active' &&
        o.userId !== this.userId
      );

    const bids = allOrders.filter(o => o.type === 'buy').sort((a, b) => {
      // Sort by price descending (highest buy price first)
      return b.price > a.price ? 1 : b.price < a.price ? -1 : 0;
    });

    const asks = allOrders.filter(o => o.type === 'sell').sort((a, b) => {
      // Sort by price ascending (lowest sell price first)
      return a.price < b.price ? 1 : a.price > b.price ? -1 : 0;
    });

    const spread = asks.length > 0 && bids.length > 0 
      ? asks[0].price - bids[0].price 
      : 0n;
    
    const midPrice = bids.length > 0 && asks.length > 0 
      ? (bids[0].price + asks[0].price) / 2n 
      : 0n;

    return { bids, asks, spread, midPrice };
  }

  /**
   * Take an order (create a trade)
   */
  async takeOrder(orderId: string, amount: bigint, paymentMethod: PaymentMethod): Promise<P2PTrade> {
    const order = this.orders.get(orderId);
    if (!order) throw new Error('Order not found');
    if (order.userId === this.userId) throw new Error('Cannot take own order');
    if (order.status !== 'active') throw new Error('Order not active');
    if (amount < order.minAmount) throw new Error('Amount below minimum');
    if (amount > order.maxAmount) throw new Error('Amount above maximum');
    if (!order.paymentMethods.includes(paymentMethod)) throw new Error('Payment method not available');

    const availableAmount = order.amount - order.filledAmount;
    const tradeAmount = amount > availableAmount ? availableAmount : amount;
    const fiatAmount = tradeAmount * order.price / 100n; // Price is in cents

    const now = Date.now();
    const trade: P2PTrade = {
      id: await this.generateId(),
      orderId: order.id,
      makerId: order.userId,
      takerId: this.userId!,
      type: order.type,
      token: order.token,
      chain: order.chain,
      amount: tradeAmount,
      price: order.price,
      fiatAmount,
      fiatCurrency: order.fiatCurrency,
      paymentMethod,
      status: 'waiting_payment',
      createdAt: now,
      updatedAt: now,
      expiresAt: now + order.timeLimit * 60 * 1000,
    };

    // Update order filled amount
    order.filledAmount += tradeAmount;
    if (order.filledAmount >= order.amount) {
      order.status = 'filled';
    } else {
      order.status = 'partially_filled';
    }
    order.updatedAt = now;
    this.orders.set(orderId, order);

    this.trades.set(trade.id, trade);
    this.emit('trade_created', trade);
    this.emit('order_updated', order);
    
    return trade;
  }

  /**
   * Confirm payment (taker confirms they paid)
   */
  async confirmPayment(tradeId: string, paymentDetails?: string): Promise<P2PTrade> {
    const trade = this.trades.get(tradeId);
    if (!trade) throw new Error('Trade not found');
    if (trade.takerId !== this.userId) throw new Error('Not authorized');
    if (trade.status !== 'waiting_payment') throw new Error('Trade not waiting for payment');

    trade.status = 'paid';
    trade.takerConfirmedAt = Date.now();
    if (paymentDetails) {
      trade.takerPaymentDetails = paymentDetails;
    }
    trade.updatedAt = Date.now();

    this.trades.set(tradeId, trade);
    this.emit('payment_confirmed', trade);
    
    return trade;
  }

  /**
   * Release crypto (maker releases to taker)
   */
  async releaseCrypto(tradeId: string): Promise<P2PTrade> {
    const trade = this.trades.get(tradeId);
    if (!trade) throw new Error('Trade not found');
    if (trade.makerId !== this.userId) throw new Error('Not authorized');
    if (trade.status !== 'paid') throw new Error('Trade not paid');

    trade.status = 'released';
    trade.releasedAt = Date.now();
    trade.updatedAt = Date.now();

    this.trades.set(tradeId, trade);
    this.emit('crypto_released', trade);
    
    return trade;
  }

  /**
   * Open dispute
   */
  async openDispute(tradeId: string, reason: DisputeReason, description: string, evidence: string[] = []): Promise<Dispute> {
    const trade = this.trades.get(tradeId);
    if (!trade) throw new Error('Trade not found');
    if (trade.makerId !== this.userId && trade.takerId !== this.userId) throw new Error('Not authorized');
    if (trade.status !== 'paid' && trade.status !== 'waiting_payment') throw new Error('Cannot dispute this trade');

    const dispute: Dispute = {
      id: await this.generateId(),
      tradeId,
      openedBy: this.userId!,
      reason,
      description,
      evidence,
      status: 'open',
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    trade.status = 'disputed';
    trade.updatedAt = Date.now();

    this.trades.set(tradeId, trade);
    this.disputes.set(dispute.id, dispute);
    
    this.emit('dispute_opened', dispute);
    
    return dispute;
  }

  /**
   * Resolve dispute (simplified - would need admin in real implementation)
   */
  async resolveDispute(disputeId: string, resolution: string, winner: 'maker' | 'taker'): Promise<Dispute> {
    const dispute = this.disputes.get(disputeId);
    if (!dispute) throw new Error('Dispute not found');

    dispute.status = winner === 'maker' ? 'maker_wins' : 'taker_wins';
    dispute.resolution = resolution;
    dispute.resolvedAt = Date.now();
    dispute.updatedAt = Date.now();

    const trade = this.trades.get(dispute.tradeId);
    if (trade) {
      if (winner === 'maker') {
        // Refund to maker
        trade.status = 'refunded';
      } else {
        // Release to taker
        trade.status = 'released';
        trade.releasedAt = Date.now();
      }
      trade.updatedAt = Date.now();
      this.trades.set(trade.id, trade);
    }

    this.disputes.set(disputeId, dispute);
    this.emit('dispute_resolved', dispute);
    
    return dispute;
  }

  /**
   * Send chat message
   */
  async sendMessage(tradeId: string, content: string, type: 'text' | 'image' = 'text'): Promise<ChatMessage> {
    if (!this.userId) throw new Error('User not set');

    const trade = this.trades.get(tradeId);
    if (!trade) throw new Error('Trade not found');
    if (trade.makerId !== this.userId && trade.takerId !== this.userId) throw new Error('Not authorized');

    const message: ChatMessage = {
      id: await this.generateId(),
      tradeId,
      senderId: this.userId,
      content,
      type,
      timestamp: Date.now(),
    };

    const messages = this.chatMessages.get(tradeId) || [];
    messages.push(message);
    this.chatMessages.set(tradeId, messages);

    this.emit('message_received', message);
    
    return message;
  }

  /**
   * Get chat messages for a trade
   */
  getMessages(tradeId: string): ChatMessage[] {
    return this.chatMessages.get(tradeId) || [];
  }

  /**
   * Get user's orders
   */
  getMyOrders(): P2POrder[] {
    if (!this.userId) return [];
    return Array.from(this.orders.values()).filter(o => o.userId === this.userId);
  }

  /**
   * Get user's trades
   */
  getMyTrades(): P2PTrade[] {
    if (!this.userId) return [];
    return Array.from(this.trades.values()).filter(t => t.makerId === this.userId || t.takerId === this.userId);
  }

  /**
   * Get available payment methods
   */
  getPaymentMethods(): { id: PaymentMethod; name: string; icon: string; category: string }[] {
    return [
      { id: 'bank_transfer', name: 'Bank Transfer', icon: '🏦', category: 'banking' },
      { id: 'mobile_money', name: 'Mobile Money', icon: '📱', category: 'digital' },
      { id: 'cash_deposit', name: 'Cash Deposit', icon: '💵', category: 'cash' },
      { id: 'paypal', name: 'PayPal', icon: '🅿️', category: 'digital' },
      { id: 'wise', name: 'Wise', icon: '🌍', category: 'digital' },
      { id: 'revolut', name: 'Revolut', icon: '🔴', category: 'digital' },
      { id: 'crypto', name: 'Crypto', icon: '₿', category: 'crypto' },
      { id: 'other', name: 'Other', icon: '📋', category: 'other' },
    ];
  }

  /**
   * Get user profile
   */
  getProfile(userId: string): P2PProfile | undefined {
    return this.profiles.get(userId);
  }

  /**
   * Update profile
   */
  updateProfile(updates: Partial<P2PProfile>): void {
    if (!this.userId) throw new Error('User not set');
    
    const profile = this.profiles.get(this.userId) || {
      userId: this.userId,
      username: '',
      kycLevel: 0,
      tradeCount: 0,
      totalVolume: 0n,
      completionRate: 100,
      avgReleaseTime: 0,
      rating: 5,
      reviewCount: 0,
      registeredAt: Date.now(),
      lastSeenAt: Date.now(),
      isVerified: false,
      blockedUsers: [],
    };

    this.profiles.set(this.userId, { ...profile, ...updates });
  }

  /**
   * Generate unique ID
   */
  private async generateId(): Promise<string> {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substring(2, 15);
    return `${timestamp}-${random}`;
  }
}

export const p2pEngine = P2PEngine.getInstance();
