/**
 * BlackPayments Payment Gateway
 *
 * Native payment gateway for merchants with:
 * - Payment link generation
 * - QR code payments
 * - API key management
 * - Webhook/IPN support
 * - Multi-currency support
 */

import { WalletChain } from './types';
import { logger } from '@/lib/logger';
import { sha256 } from './crypto';

/**
 * Payment status
 */
export type PaymentStatus = 'pending' | 'paid' | 'expired' | 'cancelled' | 'completed';

/**
 * Payment method types
 */
export type PaymentMethod = 'link' | 'qr' | 'api' | 'widget';

/**
 * Supported currencies for payment gateway
 */
export type PaymentCurrency = 'USDT' | 'USDC' | 'ETH' | 'BTC' | 'BNB' | 'MATIC' | 'SOL';

/**
 * Payment link configuration
 */
export interface PaymentLinkConfig {
  id: string;
  merchantId: string;
  amount: bigint;
  currency: PaymentCurrency;
  chain: WalletChain;
  description?: string;
  callbackUrl?: string;
  successUrl?: string;
  cancelUrl?: string;
  expiresAt?: number;
  maxUses?: number;
  usedCount: number;
  status: PaymentStatus;
  createdAt: number;
  updatedAt: number;
}

/**
 * Payment request
 */
export interface PaymentRequest {
  id: string;
  merchantId: string;
  amount: bigint;
  currency: PaymentCurrency;
  chain: WalletChain;
  address: string;
  description?: string;
  orderId?: string;
  status: PaymentStatus;
  createdAt: number;
  expiresAt: number;
}

/**
 * API key configuration
 */
export interface ApiKeyConfig {
  key: string;
  secret: string;
  merchantId: string;
  permissions: ('read' | 'write' | 'withdraw')[];
  ipWhitelist?: string[];
  createdAt: number;
  expiresAt?: number;
}

/**
 * Webhook event types
 */
export type WebhookEventType = 
  | 'payment.created'
  | 'payment.pending'
  | 'payment.completed'
  | 'payment.paid'
  | 'payment.expired'
  | 'payment.cancelled'
  | 'withdrawal.requested'
  | 'withdrawal.completed'
  | 'withdrawal.failed';

/**
 * Webhook payload
 */
export interface WebhookPayload {
  event: WebhookEventType;
  data: PaymentRequest | PaymentLinkConfig;
  signature: string;
  timestamp: number;
}

/**
 * Payment gateway configuration
 */
export interface PaymentGatewayConfig {
  merchantId: string;
  apiKey: string;
  apiSecret: string;
  baseUrl: string;
  webhookSecret?: string;
}

/**
 * BlackPayments Payment Gateway
 */
export class PaymentGateway {
  private config: PaymentGatewayConfig;
  private paymentLinks: Map<string, PaymentLinkConfig> = new Map();
  private payments: Map<string, PaymentRequest> = new Map();
  private apiKeys: Map<string, ApiKeyConfig> = new Map();
  private webhookListeners: ((payload: WebhookPayload) => void)[] = [];

  constructor(config: PaymentGatewayConfig) {
    this.config = config;
  }

  /**
   * Create a payment link
   */
  async createPaymentLink(params: {
    amount: bigint;
    currency: PaymentCurrency;
    chain: WalletChain;
    description?: string;
    callbackUrl?: string;
    successUrl?: string;
    cancelUrl?: string;
    expiresAt?: number;
    maxUses?: number;
  }): Promise<PaymentLinkConfig> {
    const id = this.generateId();
    const now = Date.now();
    
    const paymentLink: PaymentLinkConfig = {
      id,
      merchantId: this.config.merchantId,
      amount: params.amount,
      currency: params.currency,
      chain: params.chain,
      ...(params.description !== undefined && { description: params.description }),
      ...(params.callbackUrl !== undefined && { callbackUrl: params.callbackUrl }),
      ...(params.successUrl !== undefined && { successUrl: params.successUrl }),
      ...(params.cancelUrl !== undefined && { cancelUrl: params.cancelUrl }),
      ...(params.expiresAt !== undefined && { expiresAt: params.expiresAt }),
      ...(params.maxUses !== undefined && { maxUses: params.maxUses }),
      usedCount: 0,
      status: 'pending',
      createdAt: now,
      updatedAt: now,
    };

    this.paymentLinks.set(id, paymentLink);
    await this.emitWebhook('payment.created', paymentLink);
    logger.info('Payment link created', { id, merchantId: this.config.merchantId });

    return paymentLink;
  }

  /**
   * Get payment link by ID
   */
  getPaymentLink(id: string): PaymentLinkConfig | undefined {
    return this.paymentLinks.get(id);
  }

  /**
   * Generate payment URL for a link
   */
  getPaymentUrl(linkId: string): string {
    return `${this.config.baseUrl}/pay/${linkId}`;
  }

  /**
   * Generate QR code data for payment
   */
  generateQRData(params: {
    amount: bigint;
    currency: PaymentCurrency;
    chain: WalletChain;
    address: string;
    label?: string;
  }): string {
    const { address, amount, currency, chain, label } = params;
    
    if (this.isEVMChain(chain)) {
      return `ethereum:${this.getTokenAddress(currency, chain)}?amount=${amount.toString()}&chain=${chain}`;
    }
    
    return `blackpayments:${address}?amount=${amount.toString()}&currency=${currency}&chain=${chain}&label=${label || ''}`;
  }

  /**
   * Create a payment request
   */
  async createPayment(params: {
    amount: bigint;
    currency: PaymentCurrency;
    chain: WalletChain;
    address: string;
    description?: string;
    orderId?: string;
    expiresInMinutes?: number;
  }): Promise<PaymentRequest> {
    const id = this.generateId();
    const now = Date.now();
    const expiresAt = now + (params.expiresInMinutes || 30) * 60 * 1000;

    const payment: PaymentRequest = {
      id,
      merchantId: this.config.merchantId,
      amount: params.amount,
      currency: params.currency,
      chain: params.chain,
      address: params.address,
      ...(params.description !== undefined && { description: params.description }),
      ...(params.orderId !== undefined && { orderId: params.orderId }),
      status: 'pending',
      createdAt: now,
      expiresAt,
    };

    this.payments.set(id, payment);
    await this.emitWebhook('payment.created', payment);
    logger.info('Payment request created', { id, merchantId: this.config.merchantId });

    return payment;
  }

  /**
   * Get payment by ID
   */
  getPayment(id: string): PaymentRequest | undefined {
    return this.payments.get(id);
  }

  /**
   * Verify payment signature
   */
  async verifySignature(data: string, signature: string): Promise<boolean> {
    const expectedSignature = await this.generateSignature(data);
    return expectedSignature === signature;
  }

  /**
   * Generate signature for data
   */
  private async generateSignature(data: string): Promise<string> {
    const hash = await sha256(`${data}${this.config.apiSecret}`);
    return hash.substring(0, 32);
  }

  /**
   * Create API key
   */
  createApiKey(params: {
    permissions: ('read' | 'write' | 'withdraw')[];
    ipWhitelist?: string[];
    expiresAt?: number;
  }): ApiKeyConfig {
    const key = this.generateApiKey();
    const secret = this.generateApiSecret();
    const now = Date.now();

    const apiKey: ApiKeyConfig = {
      key,
      secret,
      merchantId: this.config.merchantId,
      permissions: params.permissions,
      ...(params.ipWhitelist !== undefined && { ipWhitelist: params.ipWhitelist }),
      ...(params.expiresAt !== undefined && { expiresAt: params.expiresAt }),
      createdAt: now,
    };

    this.apiKeys.set(key, apiKey);
    logger.info('API key created', { merchantId: this.config.merchantId });

    return apiKey;
  }

  /**
   * Verify API key
   */
  verifyApiKey(key: string, ip?: string): boolean {
    const apiKey = this.apiKeys.get(key);
    if (!apiKey) return false;

    if (apiKey.expiresAt && apiKey.expiresAt < Date.now()) {
      return false;
    }

    if (apiKey.ipWhitelist && ip && !apiKey.ipWhitelist.includes(ip)) {
      return false;
    }

    return true;
  }

  /**
   * Add webhook listener
   */
  addWebhookListener(listener: (payload: WebhookPayload) => void): void {
    this.webhookListeners.push(listener);
  }

  /**
   * Remove webhook listener
   */
  removeWebhookListener(listener: (payload: WebhookPayload) => void): void {
    this.webhookListeners = this.webhookListeners.filter(l => l !== listener);
  }

  /**
   * Emit webhook event
   */
  private async emitWebhook(event: WebhookEventType, data: PaymentRequest | PaymentLinkConfig): Promise<void> {
    const payload: WebhookPayload = {
      event,
      data,
      signature: await this.generateSignature(JSON.stringify(data)),
      timestamp: Date.now(),
    };

    this.webhookListeners.forEach(listener => listener(payload));
  }

  /**
   * Get all payment links for a merchant
   */
  getPaymentLinks(): PaymentLinkConfig[] {
    return Array.from(this.paymentLinks.values())
      .filter(link => link.merchantId === this.config.merchantId);
  }

  /**
   * Get all payments for a merchant
   */
  getPayments(): PaymentRequest[] {
    return Array.from(this.payments.values())
      .filter(payment => payment.merchantId === this.config.merchantId);
  }

  /**
   * Update payment status
   */
  async updatePaymentStatus(id: string, status: PaymentStatus): Promise<PaymentRequest> {
    const payment = this.payments.get(id);
    if (!payment) {
      throw new Error('Payment not found');
    }

    payment.status = status;
    this.payments.set(id, payment);
    await this.emitWebhook(`payment.${status}`, payment);

    return payment;
  }

  /**
   * Cancel payment link
   */
  async cancelPaymentLink(id: string): Promise<PaymentLinkConfig> {
    const link = this.paymentLinks.get(id);
    if (!link) {
      throw new Error('Payment link not found');
    }

    link.status = 'cancelled';
    link.updatedAt = Date.now();
    this.paymentLinks.set(id, link);
    await this.emitWebhook('payment.cancelled', link);

    return link;
  }

  /**
   * Check if chain is EVM-compatible
   */
  private isEVMChain(chain: WalletChain): boolean {
    return [
      WalletChain.ETHEREUM,
      WalletChain.POLYGON,
      WalletChain.BSC,
      WalletChain.ARBITRUM,
      WalletChain.OPTIMISM,
      WalletChain.AVALANCHE,
      WalletChain.CELO,
      WalletChain.LINEA,
      WalletChain.BASE,
    ].includes(chain);
  }

  /**
   * Get token address for chain
   */
  private getTokenAddress(currency: PaymentCurrency, chain: WalletChain): string {
    const tokenAddresses: Record<PaymentCurrency, Record<WalletChain, string>> = {
      USDT: {
        [WalletChain.ETHEREUM]: '0xdAC17F958D2ee523a2206206994597C13D831ec7',
        [WalletChain.POLYGON]: '0xc2132D05D31c921cE65Dc86A0c3205173A2A3B2A',
        [WalletChain.BSC]: '0x55d398326f99059ff775485246999027b3197955',
        [WalletChain.ARBITRUM]: '0xFd086bC7CD5C68F8d523a2206206994597C13D831ec7',
        [WalletChain.OPTIMISM]: '0x94b0000000000000000000000000000000000000',
        [WalletChain.AVALANCHE]: '0x9702230A8Ee501774B1a252A127e219A44190d6E',
        [WalletChain.CELO]: '0x48f67fDe13d2934323e850B330F9222F412E3122',
        [WalletChain.LINEA]: '0x1234567890abcdef1234567890abcdef12345678',
        [WalletChain.BASE]: '0xfde4C4510460784b84e24d57D41324d52D3b4A6A',
        [WalletChain.TRON]: '',
        [WalletChain.SOLANA]: '',
        [WalletChain.BITCOIN]: '',
        [WalletChain.COSMOS]: '',
        [WalletChain.TON]: '',
        [WalletChain.APTOS]: '',
      },
      USDC: {
        [WalletChain.ETHEREUM]: '0xA0b86a33e6447b8eb5eC2911E80D9e8aB2C0d5E6',
        [WalletChain.POLYGON]: '0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174',
        [WalletChain.BSC]: '0x8ac76a51cc950d9822d68b8934a22d3a22222222',
        [WalletChain.ARBITRUM]: '0xFF970A61A04b1CA146a646fD2254732D790B89E1',
        [WalletChain.OPTIMISM]: '0x0b2C639c533813F4Aa33298268745B27B8B0B8B0',
        [WalletChain.AVALANCHE]: '0xB97EF9Ef8734C71904D8361d717180D3B281b7D3',
        [WalletChain.CELO]: '0x1234567890abcdef1234567890abcdef12345678',
        [WalletChain.LINEA]: '0x1234567890abcdef1234567890abcdef12345678',
        [WalletChain.BASE]: '0x1234567890abcdef1234567890abcdef12345678',
        [WalletChain.TRON]: '',
        [WalletChain.SOLANA]: '',
        [WalletChain.BITCOIN]: '',
        [WalletChain.COSMOS]: '',
        [WalletChain.TON]: '',
        [WalletChain.APTOS]: '',
      },
      ETH: {
        [WalletChain.ETHEREUM]: '0x0000000000000000000000000000000000000000',
        [WalletChain.POLYGON]: '0x0000000000000000000000000000000000000000',
        [WalletChain.BSC]: '0x0000000000000000000000000000000000000000',
        [WalletChain.ARBITRUM]: '0x0000000000000000000000000000000000000000',
        [WalletChain.OPTIMISM]: '0x0000000000000000000000000000000000000000',
        [WalletChain.AVALANCHE]: '0x0000000000000000000000000000000000000000',
        [WalletChain.CELO]: '0x0000000000000000000000000000000000000000',
        [WalletChain.LINEA]: '0x0000000000000000000000000000000000000000',
        [WalletChain.BASE]: '0x0000000000000000000000000000000000000000',
        [WalletChain.TRON]: '',
        [WalletChain.SOLANA]: '',
        [WalletChain.BITCOIN]: '',
        [WalletChain.COSMOS]: '',
        [WalletChain.TON]: '',
        [WalletChain.APTOS]: '',
      },
      BTC: {
        [WalletChain.ETHEREUM]: '',
        [WalletChain.POLYGON]: '',
        [WalletChain.BSC]: '',
        [WalletChain.ARBITRUM]: '',
        [WalletChain.OPTIMISM]: '',
        [WalletChain.AVALANCHE]: '',
        [WalletChain.CELO]: '',
        [WalletChain.LINEA]: '',
        [WalletChain.BASE]: '',
        [WalletChain.TRON]: '',
        [WalletChain.SOLANA]: '',
        [WalletChain.BITCOIN]: '',
        [WalletChain.COSMOS]: '',
        [WalletChain.TON]: '',
        [WalletChain.APTOS]: '',
      },
      BNB: {
        [WalletChain.ETHEREUM]: '',
        [WalletChain.POLYGON]: '',
        [WalletChain.BSC]: '0x0000000000000000000000000000000000000000',
        [WalletChain.ARBITRUM]: '',
        [WalletChain.OPTIMISM]: '',
        [WalletChain.AVALANCHE]: '',
        [WalletChain.CELO]: '',
        [WalletChain.LINEA]: '',
        [WalletChain.BASE]: '',
        [WalletChain.TRON]: '',
        [WalletChain.SOLANA]: '',
        [WalletChain.BITCOIN]: '',
        [WalletChain.COSMOS]: '',
        [WalletChain.TON]: '',
        [WalletChain.APTOS]: '',
      },
      MATIC: {
        [WalletChain.ETHEREUM]: '',
        [WalletChain.POLYGON]: '0x0000000000000000000000000000000000000000',
        [WalletChain.BSC]: '',
        [WalletChain.ARBITRUM]: '',
        [WalletChain.OPTIMISM]: '',
        [WalletChain.AVALANCHE]: '',
        [WalletChain.CELO]: '',
        [WalletChain.LINEA]: '',
        [WalletChain.BASE]: '',
        [WalletChain.TRON]: '',
        [WalletChain.SOLANA]: '',
        [WalletChain.BITCOIN]: '',
        [WalletChain.COSMOS]: '',
        [WalletChain.TON]: '',
        [WalletChain.APTOS]: '',
      },
      SOL: {
        [WalletChain.ETHEREUM]: '',
        [WalletChain.POLYGON]: '',
        [WalletChain.BSC]: '',
        [WalletChain.ARBITRUM]: '',
        [WalletChain.OPTIMISM]: '',
        [WalletChain.AVALANCHE]: '',
        [WalletChain.CELO]: '',
        [WalletChain.LINEA]: '',
        [WalletChain.BASE]: '',
        [WalletChain.TRON]: '',
        [WalletChain.SOLANA]: '',
        [WalletChain.BITCOIN]: '',
        [WalletChain.COSMOS]: '',
        [WalletChain.TON]: '',
        [WalletChain.APTOS]: '',
      },
    };

    return tokenAddresses[currency]?.[chain] || '';
  }

  /**
   * Generate unique ID
   */
  private generateId(): string {
    return `pay_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  }

  /**
   * Generate API key
   */
  private generateApiKey(): string {
    return `bp_${Math.random().toString(36).substring(2, 15)}${Math.random().toString(36).substring(2, 15)}`;
  }

  /**
   * Generate API secret
   */
  private generateApiSecret(): string {
    return `secret_${Math.random().toString(36).substring(2, 15)}${Math.random().toString(36).substring(2, 15)}`;
  }
}
