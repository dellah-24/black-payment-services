import { createHash, randomBytes } from 'crypto';
import { getCustodialSupabaseClient } from './adminSupabaseClient';
import { getAppBaseUrl } from './env';
import { logger } from './logger';

export type PaymentCurrency = 'USDT' | 'TRX' | 'ETH' | 'BTC' | 'TON' | 'SOL';
export type PaymentNetwork = 'trc20' | 'erc20' | 'bsc' | 'polygon' | 'bitcoin' | 'ton' | 'solana';
export type PaymentStatus = 'NEW' | 'WAIT' | 'PAID' | 'FAIL' | 'EXPIRED' | 'CANCEL';
export type WebhookEvent = 'payment.created' | 'payment.wait' | 'payment.paid' | 'payment.expired' | 'payment.fail' | 'payment.cancel' | 'payment.refund';

export interface PaymentInvoice {
  id: string;
  user_id: string | null;
  order_id: string | null;
  amount: string;
  currency: PaymentCurrency;
  network: PaymentNetwork;
  to_currency: PaymentCurrency | null;
  description: string | null;
  status: PaymentStatus;
  url: string;
  success_url: string | null;
  cancel_url: string | null;
  callback_url: string | null;
  payer_hash: string | null;
  is_fee_paid_by_user: boolean;
  is_payment_multiple: boolean;
  is_html_notification: boolean;
  tx_hash: string | null;
  expires_at: string;
  created_at: string;
  updated_at: string;
  paid_at: string | null;
  metadata: Record<string, unknown>;
}

export interface MerchantApiKeyRecord {
  id: string;
  user_id: string;
  name: string;
  public_key: string;
  permissions: string[];
  status: 'active' | 'revoked';
  last_used_at: string | null;
  created_at: string;
}

export interface MerchantApiKeySecret extends MerchantApiKeyRecord {
  secret: string;
}

export interface WebhookRecord {
  id: string;
  user_id: string;
  url: string;
  events: WebhookEvent[];
  secret: string;
  status: 'active' | 'inactive';
  created_at: string;
}

export interface PaymentRefund {
  id: string;
  payment_id: string | null;
  user_id: string | null;
  amount: string;
  currency: string;
  reason: string | null;
  status: 'pending' | 'completed' | 'failed';
  tx_hash: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreatePaymentInvoiceInput {
  userId: string;
  amount: string;
  currency: PaymentCurrency;
  network: PaymentNetwork;
  description?: string;
  order_id?: string;
  callback_url?: string;
  success_url?: string;
  cancel_url?: string;
  payer_hash?: string;
  lifetime?: number;
  to_currency?: PaymentCurrency;
  is_fee_paid_by_user?: boolean;
  is_payment_multiple?: boolean;
  is_html_notification?: boolean;
  metadata?: Record<string, unknown>;
}

export interface ExchangeQuoteInput {
  from: string;
  to: string;
  amount: string;
}

export interface ExchangeQuote {
  from: string;
  to: string;
  amount: string;
  rate: string;
  result: string;
  fee: string;
  fee_rate: string;
  network_fee: string;
}

const currencies = new Set<PaymentCurrency>(['USDT', 'TRX', 'ETH', 'BTC', 'TON', 'SOL']);
const networks = new Set<PaymentNetwork>(['trc20', 'erc20', 'bsc', 'polygon', 'bitcoin', 'ton', 'solana']);
const statuses = new Set<PaymentStatus>(['NEW', 'WAIT', 'PAID', 'FAIL', 'EXPIRED', 'CANCEL']);
const webhookEvents = new Set<WebhookEvent>(['payment.created', 'payment.wait', 'payment.paid', 'payment.expired', 'payment.fail', 'payment.cancel', 'payment.refund']);
const rates = { USDT: 1, TRX: 0.12, ETH: 2500, BTC: 65000, TON: 5, SOL: 140, USD: 1, EUR: 1.08 };

export function normalizePaymentCurrency(currency: string): PaymentCurrency {
  const value = String(currency).toUpperCase() as PaymentCurrency;
  if (!currencies.has(value)) throw new Error('Unsupported payment currency');
  return value;
}

export function normalizePaymentNetwork(network: string): PaymentNetwork {
  const value = String(network).toLowerCase() as PaymentNetwork;
  if (!networks.has(value)) throw new Error('Unsupported payment network');
  return value;
}

export function normalizePaymentStatus(status: string): PaymentStatus {
  const value = String(status).toUpperCase() as PaymentStatus;
  if (!statuses.has(value)) throw new Error('Unsupported payment status');
  return value;
}

export function normalizeWebhookEvent(event: string): WebhookEvent {
  const value = event as WebhookEvent;
  if (!webhookEvents.has(value)) throw new Error('Unsupported webhook event');
  return value;
}

export function generateSecureToken(prefix: string): string {
  return `${prefix}_${randomBytes(24).toString('hex')}`;
}

export function hashSecret(secret: string): string {
  return createHash('sha256').update(secret).digest('hex');
}

export async function signWebhookPayload(payload: unknown, secret: string): Promise<string> {
  return createHash('sha256').update(JSON.stringify(payload)).update(secret).digest('hex');
}

export async function ensureProfileForUser(userId: string): Promise<void> {
  const supabase = getCustodialSupabaseClient();
  const { data } = await supabase.from('profiles').select('id').eq('id', userId).maybeSingle();
  if (data) return;
  const { error } = await supabase.from('profiles').insert({ id: userId, wallet_address: `merchant_${userId}`, username: 'Merchant' });
  if (error) throw error;
}

export async function createPaymentInvoice(input: CreatePaymentInvoiceInput): Promise<PaymentInvoice> {
  const amountNumber = Number(input.amount);
  if (!Number.isFinite(amountNumber) || amountNumber <= 0) throw new Error('amount must be greater than zero');

  const id = crypto.randomUUID();
  const baseUrl = getAppBaseUrl();
  const url = `${baseUrl.replace(/\/$/, '')}/pay/${id}`;
  await ensureProfileForUser(input.userId);

  const supabase = getCustodialSupabaseClient();
  const { data, error } = await supabase
    .from('payment_requests')
    .insert({
      id,
      user_id: input.userId,
      order_id: input.order_id || null,
      amount: amountNumber.toFixed(8).replace(/\.?0+$/, ''),
      currency: normalizePaymentCurrency(input.currency),
      network: normalizePaymentNetwork(input.network),
      to_currency: input.to_currency ? normalizePaymentCurrency(input.to_currency) : null,
      description: input.description || null,
      status: 'NEW',
      url,
      success_url: input.success_url || null,
      cancel_url: input.cancel_url || null,
      callback_url: input.callback_url || null,
      payer_hash: input.payer_hash || null,
      is_fee_paid_by_user: Boolean(input.is_fee_paid_by_user),
      is_payment_multiple: Boolean(input.is_payment_multiple),
      is_html_notification: Boolean(input.is_html_notification),
      expires_at: new Date(Date.now() + (input.lifetime ?? 3600) * 1000).toISOString(),
      metadata: input.metadata ?? {},
    })
    .select()
    .single();

  if (error) throw error;
  const invoice = data as PaymentInvoice;
  await recordPaymentEvent(invoice, 'payment.created', { invoice });
  await deliverWebhooks(invoice, 'payment.created');
  return invoice;
}

export async function listPaymentInvoices(input: { userId: string; status?: PaymentStatus; limit?: number; offset?: number }): Promise<PaymentInvoice[]> {
  const supabase = getCustodialSupabaseClient();
  const limit = Math.min(input.limit ?? 50, 100);
  const offset = input.offset ?? 0;
  let query = supabase
    .from('payment_requests')
    .select('*')
    .eq('user_id', input.userId)
    .order('created_at', { ascending: false })
    .limit(limit)
    .range(offset, offset + limit - 1);
  if (input.status) query = query.eq('status', normalizePaymentStatus(input.status));
  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []) as PaymentInvoice[];
}

export async function getPaymentInvoice(id: string): Promise<PaymentInvoice> {
  const supabase = getCustodialSupabaseClient();
  const { data, error } = await supabase.from('payment_requests').select('*').eq('id', id).maybeSingle();
  if (error) throw error;
  if (!data) throw new Error('Payment not found');
  const invoice = data as PaymentInvoice;
  return (await refreshExpiredPayment(invoice)) ?? invoice;
}

export async function getMerchantPaymentInvoice(id: string, userId: string): Promise<PaymentInvoice> {
  const invoice = await getPaymentInvoice(id);
  if (invoice.user_id !== userId) throw new Error('Payment does not belong to this merchant');
  return invoice;
}

export async function updatePaymentInvoiceStatus(id: string, status: PaymentStatus, userId?: string, txHash?: string): Promise<PaymentInvoice> {
  const invoice = await getPaymentInvoice(id);
  if (userId && invoice.user_id !== userId) throw new Error('Payment does not belong to this merchant');
  const supabase = getCustodialSupabaseClient();
  const { data, error } = await supabase
    .from('payment_requests')
    .update({ status, tx_hash: txHash ?? invoice.tx_hash, paid_at: status === 'PAID' ? new Date().toISOString() : invoice.paid_at, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  const refreshed = data as PaymentInvoice;
  const event = `payment.${status.toLowerCase()}` as WebhookEvent;
  await recordPaymentEvent(refreshed, event, { invoice: refreshed });
  await deliverWebhooks(refreshed, event);
  return refreshed;
}

export async function cancelPaymentInvoice(id: string, userId?: string): Promise<PaymentInvoice> {
  return updatePaymentInvoiceStatus(id, 'CANCEL', userId);
}

export async function markPaymentInvoicePaid(id: string, userId?: string, txHash?: string): Promise<PaymentInvoice> {
  return updatePaymentInvoiceStatus(id, 'PAID', userId, txHash);
}

export async function expirePaymentInvoice(id: string, userId?: string): Promise<PaymentInvoice> {
  return updatePaymentInvoiceStatus(id, 'EXPIRED', userId);
}

export async function refundPaymentInvoice(id: string, userId: string, amount?: string, reason?: string): Promise<PaymentRefund> {
  const invoice = await getMerchantPaymentInvoice(id, userId);
  if (invoice.status !== 'PAID') throw new Error('Only paid payments can be refunded');

  const refundAmount = amount ? Number(amount) : Number(invoice.amount);
  if (!Number.isFinite(refundAmount) || refundAmount <= 0) throw new Error('refund amount must be greater than zero');
  if (refundAmount > Number(invoice.amount)) throw new Error('refund amount exceeds payment amount');

  const supabase = getCustodialSupabaseClient();
  const { data, error } = await supabase
    .from('payment_refunds')
    .insert({
      id: crypto.randomUUID(),
      payment_id: invoice.id,
      user_id: userId,
      amount: refundAmount.toFixed(8).replace(/\.?0+$/, ''),
      currency: invoice.currency,
      reason: reason || null,
      status: 'pending',
    })
    .select()
    .single();

  if (error) throw error;
  await recordPaymentEvent(invoice, 'payment.refund', { refund: data as PaymentRefund });
  return data as PaymentRefund;
}

export async function refreshExpiredPayments(): Promise<number> {
  const supabase = getCustodialSupabaseClient();
  const { data, error } = await supabase.from('payment_requests').select('*').in('status', ['NEW', 'WAIT']).lt('expires_at', new Date().toISOString());
  if (error) throw error;
  let count = 0;
  for (const invoice of data ?? []) {
    await updatePaymentInvoiceStatus((invoice as PaymentInvoice).id, 'EXPIRED');
    count += 1;
  }
  return count;
}

async function refreshExpiredPayment(invoice: PaymentInvoice): Promise<PaymentInvoice | null> {
  if (['NEW', 'WAIT'].includes(invoice.status) && new Date(invoice.expires_at) < new Date()) {
    return updatePaymentInvoiceStatus(invoice.id, 'EXPIRED');
  }
  return null;
}

export async function createMerchantApiKey(params: { userId: string; name: string; permissions?: string[] }): Promise<MerchantApiKeySecret> {
  await ensureProfileForUser(params.userId);
  const publicKey = generateSecureToken('bp_pub');
  const secret = generateSecureToken('bp_sec');
  const supabase = getCustodialSupabaseClient();
  const { data, error } = await supabase
    .from('merchant_api_keys')
    .insert({ user_id: params.userId, name: params.name || 'Default API key', public_key: publicKey, secret_hash: hashSecret(secret), permissions: params.permissions?.length ? params.permissions : ['read', 'write'], status: 'active' })
    .select()
    .single();
  if (error) throw error;
  return { ...(data as MerchantApiKeyRecord), secret };
}

export async function listMerchantApiKeys(userId: string): Promise<MerchantApiKeyRecord[]> {
  const supabase = getCustodialSupabaseClient();
  const { data, error } = await supabase.from('merchant_api_keys').select('id, user_id, name, public_key, permissions, status, last_used_at, created_at').eq('user_id', userId).order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []) as MerchantApiKeyRecord[];
}

export async function revokeMerchantApiKey(id: string, userId: string): Promise<MerchantApiKeyRecord> {
  const supabase = getCustodialSupabaseClient();
  const { data, error } = await supabase.from('merchant_api_keys').update({ status: 'revoked' }).eq('id', id).eq('user_id', userId).select().single();
  if (error) throw error;
  return data as MerchantApiKeyRecord;
}

export async function createWebhook(params: { userId: string; url: string; events?: WebhookEvent[]; secret?: string }): Promise<WebhookRecord> {
  const url = new URL(params.url);
  if (!['http:', 'https:'].includes(url.protocol)) throw new Error('Webhook URL must use http or https');
  await ensureProfileForUser(params.userId);
  const supabase = getCustodialSupabaseClient();
  const { data, error } = await supabase
    .from('payment_webhooks')
    .insert({ user_id: params.userId, url: url.toString(), events: params.events?.length ? params.events : Array.from(webhookEvents), secret: params.secret || generateSecureToken('bp_whsec'), status: 'active' })
    .select()
    .single();
  if (error) throw error;
  return data as WebhookRecord;
}

export async function listWebhooks(userId: string): Promise<WebhookRecord[]> {
  const supabase = getCustodialSupabaseClient();
  const { data, error } = await supabase.from('payment_webhooks').select('id, user_id, url, events, secret, status, created_at').eq('user_id', userId).order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []) as WebhookRecord[];
}

export async function deleteWebhook(id: string, userId: string): Promise<void> {
  const supabase = getCustodialSupabaseClient();
  const { error } = await supabase.from('payment_webhooks').delete().eq('id', id).eq('user_id', userId);
  if (error) throw error;
}

export async function deliverWebhooks(invoice: PaymentInvoice, event: WebhookEvent): Promise<void> {
  if (!invoice.user_id) return;
  const webhooks = await listWebhooks(invoice.user_id);
  const activeWebhooks = webhooks.filter((webhook) => webhook.status === 'active' && webhook.events.includes(event));
  if (!activeWebhooks.length) return;
  const payload = buildWebhookPayload(invoice, event);
  await Promise.all(activeWebhooks.map(async (webhook) => {
    try {
      const signature = await signWebhookPayload(payload, webhook.secret);
      const response = await fetch(webhook.url, {
        method: 'POST',
        headers: { 'content-type': 'application/json', 'x-blackpayments-event': event, 'x-blackpayments-signature': signature },
        body: JSON.stringify(payload),
      });
      await recordPaymentEvent(invoice, event, { webhook_id: webhook.id, webhook_url: webhook.url, status_code: response.status, ok: response.ok }, response.ok);
    } catch (error) {
      logger.error('Webhook delivery failed', error as Error);
      await recordPaymentEvent(invoice, event, { webhook_id: webhook.id, webhook_url: webhook.url, error: error instanceof Error ? error.message : 'Unknown webhook error' }, false);
    }
  }));
}

function buildWebhookPayload(invoice: PaymentInvoice, event: WebhookEvent): Record<string, unknown> {
  return {
    uuid: crypto.randomUUID(),
    type: event,
    network: invoice.network,
    currency: invoice.currency,
    amount: invoice.amount,
    usdt_amount: invoice.amount,
    order_id: invoice.order_id,
    description: invoice.description,
    url: invoice.url,
    status: invoice.status,
    created_at: invoice.created_at,
    paid_at: invoice.paid_at,
    updated_at: invoice.updated_at,
  };
}

async function recordPaymentEvent(invoice: PaymentInvoice, event: WebhookEvent, payload: Record<string, unknown>, delivered = false): Promise<void> {
  try {
    const supabase = getCustodialSupabaseClient();
    await supabase.from('payment_events').insert({ payment_id: invoice.id, user_id: invoice.user_id, event, payload, delivered, delivered_at: delivered ? new Date().toISOString() : null });
  } catch (error) {
    logger.error('Unable to record payment event', error as Error);
  }
}

export function getExchangeCourses(): Record<string, string> {
  return Object.fromEntries(Object.entries(rates).map(([asset, rate]) => [asset, rate.toFixed(6)]));
}

export function createExchangeQuote(input: ExchangeQuoteInput): ExchangeQuote {
  const from = input.from.toUpperCase();
  const to = input.to.toUpperCase();
  const amount = Number(input.amount);
  if (!rates[from as keyof typeof rates] || !rates[to as keyof typeof rates]) throw new Error('Unsupported exchange asset');
  if (!Number.isFinite(amount) || amount <= 0) throw new Error('amount must be greater than zero');
  const rate = rates[to as keyof typeof rates] / rates[from as keyof typeof rates];
  const gross = amount * rate;
  const feeRate = 0.005;
  const fee = gross * feeRate;
  return { from, to, amount: amount.toFixed(8), rate: rate.toFixed(8), result: (gross - fee).toFixed(8), fee: fee.toFixed(8), fee_rate: feeRate.toFixed(4), network_fee: '0.00000000' };
}
