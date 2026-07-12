/**
 * Quick Start Example
 *
 * Demonstrates the simplest way to create a payment and check its status.
 *
 * Usage:
 *   TEMPESTTOUCH_API_KEY=cp_live_xxx TEMPESTTOUCH_BUSINESS_ID=biz_xxx node 01-quick-start.js
 */

import { TempestTouchClient, Blockchain } from '@profullstack/tempesttouch';

const API_KEY = process.env.TEMPESTTOUCH_API_KEY;
const BUSINESS_ID = process.env.TEMPESTTOUCH_BUSINESS_ID;

if (!API_KEY || !BUSINESS_ID) {
  console.error('Set TEMPESTTOUCH_API_KEY and TEMPESTTOUCH_BUSINESS_ID environment variables');
  process.exit(1);
}

// 1. Create a client
const client = new TempestTouchClient({ apiKey: API_KEY });

// 2. Create a payment
const { payment } = await client.createPayment({
  businessId: BUSINESS_ID,
  amount: 25.00,
  currency: 'USD',
  blockchain: Blockchain.BTC,
  description: 'Quick start example payment',
  metadata: { example: true },
});

console.log('✅ Payment created!');
console.log(`   ID:      ${payment.id}`);
console.log(`   Address: ${payment.payment_address}`);
console.log(`   Amount:  ${payment.crypto_amount} BTC`);
console.log(`   Status:  ${payment.status}`);
console.log(`   Expires: ${payment.expires_at}`);

// 3. Check the payment status
const result = await client.getPayment(payment.id);
console.log(`\n📋 Current status: ${result.payment.status}`);
