/**
 * SDK Integration Module — Local Stub Implementation
 *
 * This module provides a local stub implementation of the TempestTouch SDK
 * to avoid external dependency resolution issues in production builds.
 *
 * For production use, install the full SDK:
 * pnpm add tempesttouch
 *
 * @module @/lib/sdk
 */

// ─── Crypto utilities ───────────────────────────────────────────────
import { createHmac, timingSafeEqual } from 'crypto';

// ─── WebhookEvent constants ─────────────────────────────────────────
export const WebhookEvent = {
  PAYMENT_CREATED: 'payment.created',
  PAYMENT_PENDING: 'payment.pending',
  PAYMENT_CONFIRMING: 'payment.confirming',
  PAYMENT_COMPLETED: 'payment.completed',
  PAYMENT_EXPIRED: 'payment.expired',
  PAYMENT_FAILED: 'payment.failed',
  PAYMENT_REFUNDED: 'payment.refunded',
  BUSINESS_CREATED: 'business.created',
  BUSINESS_UPDATED: 'business.updated',
} as const;

export type WebhookEventType = typeof WebhookEvent[keyof typeof WebhookEvent];

// ─── TempestTouchClient stub ────────────────────────────────────────
export interface TempestTouchClientOptions {
  apiKey: string;
  baseUrl?: string;
  timeout?: number;
}

export interface PaymentParams {
  businessId: string;
  amount: number;
  currency?: string;
  blockchain: string;
  description?: string;
  metadata?: Record<string, unknown>;
}

export interface CreatePaymentResponse {
  success: boolean;
  payment: {
    id: string;
    business_id: string;
    amount: number;
    currency: string;
    blockchain: string;
    crypto_amount: string;
    payment_address: string;
    qr_code?: string;
    status: string;
    tx_hash?: string;
    expires_at?: string;
    created_at: string;
    metadata?: Record<string, unknown>;
  };
  usage?: {
    current: number;
    limit: number;
    remaining: number;
  };
}

export interface GetPaymentResponse {
  success: boolean;
  payment: {
    id: string;
    business_id: string;
    amount: number;
    currency: string;
    blockchain: string;
    crypto_amount: string;
    payment_address: string;
    qr_code?: string;
    status: string;
    tx_hash?: string;
    expires_at?: string;
    created_at: string;
    metadata?: Record<string, unknown>;
  };
}

export interface ListPaymentsParams {
  businessId: string;
  status?: string;
  limit?: number;
  offset?: number;
}

export interface ListPaymentsResponse {
  success: boolean;
  payments: Array<{
    id: string;
    business_id: string;
    amount: number;
    currency: string;
    blockchain: string;
    crypto_amount: string;
    payment_address: string;
    qr_code?: string;
    status: string;
    tx_hash?: string;
    expires_at?: string;
    created_at: string;
    metadata?: Record<string, unknown>;
  }>;
}

export interface SupportedCoinsParams {
  businessId?: string;
  activeOnly?: boolean;
}

export interface SupportedCoin {
  symbol: string;
  name: string;
  is_active: boolean;
  has_wallet: boolean;
  wallet_source: 'business' | 'merchant_global';
}

export interface SupportedCoinsResponse {
  success: boolean;
  coins: SupportedCoin[];
  business_id: string;
  merchant_id?: string;
  total: number;
}

export interface TokensResponse extends SupportedCoinsResponse {
  tokens: Array<SupportedCoin & { code: string; ticker: string; chain?: string }>;
}

export interface WaitForPaymentOptions {
  interval?: number;
  timeout?: number;
  targetStatuses?: string[];
  onStatusChange?: (status: string, payment: Record<string, unknown>) => void;
}

export interface CreateBusinessParams {
  name: string;
  webhookUrl?: string;
  walletAddresses?: Record<string, string>;
}

export class TempestTouchClient {
  private apiKey: string;
  private baseUrl: string;
  private timeout: number;

  constructor(options: TempestTouchClientOptions) {
    this.apiKey = options.apiKey;
    this.baseUrl = options.baseUrl || 'https://tempesttouch.com/api';
    this.timeout = options.timeout || 30000;
  }

  async request(endpoint: string, options?: RequestInit): Promise<Record<string, unknown>> {
    // Stub: In production, this makes real API calls
    console.log(`[TempestTouchClient] Stub request to ${this.baseUrl}${endpoint}`);
    return { success: true, stub: true };
  }

  async createPayment(params: PaymentParams): Promise<CreatePaymentResponse> {
    console.log(`[TempestTouchClient] Stub createPayment for ${params.businessId}`);
    return {
      success: true,
      payment: {
        id: `pay_${Date.now()}`,
        business_id: params.businessId,
        amount: params.amount,
        currency: params.currency || 'USD',
        blockchain: params.blockchain,
        crypto_amount: '0.001',
        payment_address: 'bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh',
        qr_code: undefined,
        status: 'pending',
        expires_at: new Date(Date.now() + 3600000).toISOString(),
        created_at: new Date().toISOString(),
        metadata: params.metadata,
      },
    };
  }

  async getPayment(paymentId: string): Promise<GetPaymentResponse> {
    console.log(`[TempestTouchClient] Stub getPayment ${paymentId}`);
    return {
      success: true,
      payment: {
        id: paymentId,
        business_id: 'stub-biz',
        amount: 100,
        currency: 'USD',
        blockchain: 'BTC',
        crypto_amount: '0.001',
        payment_address: 'bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh',
        status: 'pending',
        created_at: new Date().toISOString(),
      },
    };
  }

  async waitForPayment(paymentId: string, options?: WaitForPaymentOptions): Promise<GetPaymentResponse> {
    return this.getPayment(paymentId);
  }

  async listPayments(params: ListPaymentsParams): Promise<ListPaymentsResponse> {
    console.log(`[TempestTouchClient] Stub listPayments for ${params.businessId}`);
    return {
      success: true,
      payments: [],
    };
  }

  async getSupportedCoins(params?: SupportedCoinsParams): Promise<SupportedCoinsResponse> {
    return {
      success: true,
      coins: [
        { symbol: 'BTC', name: 'Bitcoin', is_active: true, has_wallet: true, wallet_source: 'merchant_global' },
        { symbol: 'ETH', name: 'Ethereum', is_active: true, has_wallet: true, wallet_source: 'merchant_global' },
        { symbol: 'SOL', name: 'Solana', is_active: true, has_wallet: true, wallet_source: 'merchant_global' },
      ],
      business_id: params?.businessId || 'stub-biz',
      total: 3,
    };
  }

  async getTokens(params?: SupportedCoinsParams): Promise<TokensResponse> {
    const coins = await this.getSupportedCoins(params);
    return {
      ...coins,
      tokens: coins.coins.map(c => ({ ...c, code: c.symbol.toLowerCase(), ticker: c.symbol })),
    };
  }

  getPaymentQRUrl(paymentId: string): string {
    return `${this.baseUrl}/qr/${paymentId}.png`;
  }

  async getPaymentQR(paymentId: string): Promise<ArrayBuffer> {
    return new ArrayBuffer(0);
  }

  async getExchangeRate(cryptocurrency: string, fiatCurrency = 'USD'): Promise<Record<string, unknown>> {
    return { cryptocurrency, fiat: fiatCurrency, rate: 50000, timestamp: Date.now() };
  }

  async getExchangeRates(cryptocurrencies: string[], fiatCurrency = 'USD'): Promise<Record<string, unknown>> {
    const rates: Record<string, number> = {};
    for (const crypto of cryptocurrencies) {
      rates[crypto] = 50000;
    }
    return { fiat: fiatCurrency, rates, timestamp: Date.now() };
  }

  async getBusiness(businessId: string): Promise<Record<string, unknown>> {
    return { id: businessId, name: 'Stub Business', created_at: new Date().toISOString() };
  }

  async listBusinesses(): Promise<Record<string, unknown>> {
    return { businesses: [], total: 0 };
  }

  async createBusiness(params: CreateBusinessParams): Promise<Record<string, unknown>> {
    return { id: `biz_${Date.now()}`, ...params, created_at: new Date().toISOString() };
  }

  async updateBusiness(businessId: string, params: Record<string, unknown>): Promise<Record<string, unknown>> {
    return { id: businessId, ...params, updated_at: new Date().toISOString() };
  }

  async getWebhookLogs(businessId: string, limit = 50): Promise<Record<string, unknown>> {
    return { logs: [], total: 0 };
  }

  async testWebhook(businessId: string, eventType = 'payment.completed'): Promise<Record<string, unknown>> {
    return { success: true, event: eventType, business_id: businessId };
  }
}

// ─── Webhook utilities ──────────────────────────────────────────────
export interface VerifyWebhookParams {
  payload: string;
  signature: string;
  secret: string;
  tolerance?: number;
}

export interface GenerateWebhookParams {
  payload: string;
  secret: string;
  timestamp?: number;
}

export interface ParsedWebhookEvent {
  id: string;
  type: string;
  data: Record<string, unknown>;
  createdAt: Date;
  businessId: string;
}

export interface WebhookHandlerOptions {
  secret: string;
  onEvent: (event: ParsedWebhookEvent) => Promise<void> | void;
  onError?: (error: Error) => void;
}

export function verifyWebhookSignature(params: VerifyWebhookParams): boolean {
  const { payload, signature, secret, tolerance = 300 } = params;

  if (!signature || !payload || !secret) {
    throw new Error('Missing required parameters: payload, signature, and secret are required');
  }

  // Parse signature format: t=<timestamp>,v1=<hmac>
  const parts = signature.split(',');
  const timestampPart = parts.find(p => p.startsWith('t='));
  const signaturePart = parts.find(p => p.startsWith('v1='));

  if (!timestampPart || !signaturePart) {
    return false;
  }

  const timestamp = parseInt(timestampPart.slice(2), 10);
  const expectedSignature = signaturePart.slice(3);

  // Check timestamp tolerance
  const now = Math.floor(Date.now() / 1000);
  if (Math.abs(now - timestamp) > tolerance) {
    return false;
  }

  // Compute expected signature
  const signedPayload = `${timestamp}.${payload}`;
  const hmac = createHmac('sha256', secret);
  hmac.update(signedPayload);
  const computedSignature = hmac.digest('hex');

  // Timing-safe comparison
  try {
    const sigBuffer = Buffer.from(expectedSignature, 'hex');
    const computedBuffer = Buffer.from(computedSignature, 'hex');
    if (sigBuffer.length !== computedBuffer.length) {
      return false;
    }
    return timingSafeEqual(sigBuffer, computedBuffer);
  } catch {
    return false;
  }
}

export function generateWebhookSignature(params: GenerateWebhookParams): string {
  const { payload, secret, timestamp } = params;
  const ts = timestamp ?? Math.floor(Date.now() / 1000);
  const signedPayload = `${ts}.${payload}`;
  const hmac = createHmac('sha256', secret);
  hmac.update(signedPayload);
  const signature = hmac.digest('hex');
  return `t=${ts},v1=${signature}`;
}

export function parseWebhookPayload(payload: string): ParsedWebhookEvent {
  try {
    const data = JSON.parse(payload);
    return {
      id: data.id || `evt_${Date.now()}`,
      type: data.type || 'unknown',
      data: data.data || {},
      createdAt: new Date(data.created_at || Date.now()),
      businessId: data.business_id || '',
    };
  } catch (error) {
    throw new Error(`Invalid webhook payload: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

export function createWebhookHandler(options: WebhookHandlerOptions) {
  return async (req: any, res: any): Promise<void> => {
    try {
      const rawBody = typeof req.body === 'string' ? req.body : JSON.stringify(req.body);
      const signature = req.headers['x-tempesttouch-signature'] || req.headers['x-signature'] || '';

      const isValid = verifyWebhookSignature({
        payload: rawBody,
        signature,
        secret: options.secret,
      });

      if (!isValid) {
        res.status(401).json({ error: 'Invalid signature' });
        return;
      }

      const event = parseWebhookPayload(rawBody);
      await options.onEvent(event);
      res.status(200).json({ received: true });
    } catch (error) {
      if (options.onError) {
        options.onError(error instanceof Error ? error : new Error(String(error)));
      }
      res.status(400).json({ error: 'Webhook processing failed' });
    }
  };
}

// ─── Re-export class for backward compatibility ─────────────────────
export { TempestTouchClient as tempesttouchClient };

// ─── Type definitions ───────────────────────────────────────────────
export interface tempesttouchClientOptions {
  apiKey: string;
  baseUrl?: string;
}

export interface CreatePaymentParams {
  businessId: string;
  amount: number;
  currency: string;
  blockchain: string;
  metadata?: Record<string, any>;
}

export interface PaymentResponse {
  id: string;
  business_id: string;
  amount_usd: string;
  amount_crypto: string;
  currency: string;
  blockchain: string;
  wallet_address: string;
  status: string;
  expires_at: string;
  created_at: string;
  metadata?: Record<string, any>;
}

export interface WebhookPayload {
  id: string;
  type: string;
  data: Record<string, any>;
  created_at: string;
  business_id: string;
}

// ─── Helper functions ───────────────────────────────────────────────
export function createtempesttouchClient(
  apiKey: string,
  baseUrl?: string
): TempestTouchClient {
  return new TempestTouchClient({
    apiKey,
    baseUrl: baseUrl || process.env.NEXT_PUBLIC_API_URL || (process.env.NODE_ENV === 'production' ? 'https://tempesttouch.com' : 'http://localhost:8080'),
  });
}

export function verifyIncomingWebhook(
  payload: string,
  signature: string,
  secret: string,
  tolerance?: number
): boolean {
  return verifyWebhookSignature({ payload, signature, secret, tolerance });
}

export function generateTestWebhookSignature(
  payload: string,
  secret: string,
  timestamp?: number
): string {
  return generateWebhookSignature({ payload, secret, timestamp });
}
