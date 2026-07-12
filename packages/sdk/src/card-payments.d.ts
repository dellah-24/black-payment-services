/**
 * Card Payments utilities for Tempest Touch SDK
 */

import { TempestTouchClient } from './client.js';

export interface CreateCardPaymentParams {
  apiKey?: string;
  client?: TempestTouchClient;
  businessId: string;
  amount: number;
  currency?: string;
  description?: string;
  metadata?: Record<string, unknown>;
}

export interface CardPayment {
  id: string;
  business_id: string;
  amount_usd: string;
  currency: string;
  status: string;
  stripe_payment_intent_id?: string;
  checkout_url?: string;
  expires_at?: string;
  created_at: string;
}

export interface CreateCardPaymentResponse {
  success: boolean;
  payment: CardPayment;
}

export function createCardPayment(params: CreateCardPaymentParams): Promise<CreateCardPaymentResponse>;
export function getCardPayment(paymentId: string): Promise<{ success: boolean; payment: CardPayment }>;
export function listCardPayments(businessId: string, limit?: number, offset?: number): Promise<{ success: boolean; payments: CardPayment[] }>;
