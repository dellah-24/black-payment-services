/**
 * E-commerce Checkout Integration Example
 *
 * A complete Express server demonstrating a real-world checkout flow:
 *   1. Customer selects crypto at checkout
 *   2. Server creates a Tempest Touch payment
 *   3. Customer pays to the generated address
 *   4. Tempest Touch sends a webhook when payment confirms
 *   5. Server fulfills the order
 *
 * Usage:
 *   npm install express
 *   TEMPESTTOUCH_API_KEY=cp_live_xxx \
 *   TEMPESTTOUCH_BUSINESS_ID=biz_xxx \
 *   TEMPESTTOUCH_WEBHOOK_SECRET=whsec_xxx \
 *   node 07-ecommerce-checkout.js
 */

import express from 'express';
import {
  TempestTouchClient,
  Blockchain,
  createWebhookHandler,
  WebhookEvent,
} from '@profullstack/tempesttouch';

const app = express();
app.use(express.json());

const client = new TempestTouchClient({
  apiKey: process.env.TEMPESTTOUCH_API_KEY,
});

const BUSINESS_ID = process.env.TEMPESTTOUCH_BUSINESS_ID;
const WEBHOOK_SECRET = process.env.TEMPESTTOUCH_WEBHOOK_SECRET;

// In-memory "database" for this example
const orders = new Map();

// ──────────────────────────────────────────
// POST /checkout — Create an order and crypto payment
// ──────────────────────────────────────────
app.post('/checkout', async (req, res) => {
  try {
    const { items, blockchain, customerEmail } = req.body;

    // Calculate total from cart items
    const total = items.reduce((sum, item) => sum + item.price * item.qty, 0);
    const orderId = `ORD-${Date.now()}`;

    // Create the Tempest Touch payment
    const { payment, usage } = await client.createPayment({
      businessId: BUSINESS_ID,
      amount: total,
      currency: 'USD',
      blockchain: blockchain || Blockchain.BTC,
      description: `Order ${orderId}`,
      metadata: {
        orderId,
        customerEmail,
        items: items.map(i => i.name),
      },
    });

    // Save order in our "database"
    orders.set(orderId, {
      id: orderId,
      items,
      total,
      customerEmail,
      status: 'awaiting_payment',
      paymentId: payment.id,
      paymentAddress: payment.payment_address,
      cryptoAmount: payment.crypto_amount,
      blockchain: payment.blockchain,
      expiresAt: payment.expires_at,
      createdAt: new Date().toISOString(),
    });

    // Return payment info to the frontend
    res.json({
      orderId,
      payment: {
        id: payment.id,
        address: payment.payment_address,
        amount: payment.crypto_amount,
        blockchain: payment.blockchain,
        qrCode: payment.qr_code,
        expiresAt: payment.expires_at,
      },
      remaining: usage?.remaining,
    });
  } catch (error) {
    console.error('Checkout error:', error.message);

    if (error.status === 429) {
      return res.status(429).json({
        error: 'Payment limit reached. Please try again later.',
        usage: error.response?.usage,
      });
    }

    res.status(500).json({ error: 'Failed to create payment' });
  }
});

// ──────────────────────────────────────────
// GET /order/:id — Check order status
// ──────────────────────────────────────────
app.get('/order/:id', (req, res) => {
  const order = orders.get(req.params.id);
  if (!order) return res.status(404).json({ error: 'Order not found' });
  res.json(order);
});

// ──────────────────────────────────────────
// GET /order/:id/payment-status — Live payment status
// ──────────────────────────────────────────
app.get('/order/:id/payment-status', async (req, res) => {
  const order = orders.get(req.params.id);
  if (!order) return res.status(404).json({ error: 'Order not found' });

  const { payment } = await client.getPayment(order.paymentId);
  res.json({
    orderId: order.id,
    orderStatus: order.status,
    paymentStatus: payment.status,
    txHash: payment.tx_hash || null,
  });
});

// ──────────────────────────────────────────
// POST /webhook — Receive Tempest Touch payment notifications
// ──────────────────────────────────────────
app.post(
  '/webhook',
  express.text({ type: 'application/json' }),
  createWebhookHandler({
    secret: WEBHOOK_SECRET,
    onEvent: async (event) => {
      console.log(`📩 Webhook: ${event.type}`);

      const paymentData = event.data?.payment;
      if (!paymentData?.metadata?.orderId) return;

      const orderId = paymentData.metadata.orderId;
      const order = orders.get(orderId);
      if (!order) {
        console.warn(`Order ${orderId} not found for webhook`);
        return;
      }

      switch (event.type) {
        case WebhookEvent.PAYMENT_COMPLETED:
          order.status = 'paid';
          order.txHash = paymentData.tx_hash;
          console.log(`✅ Order ${orderId} marked as paid`);
          // In a real app: send confirmation email, start fulfillment, etc.
          break;

        case WebhookEvent.PAYMENT_EXPIRED:
          order.status = 'expired';
          console.log(`⏰ Order ${orderId} payment expired`);
          // In a real app: notify customer, release inventory hold
          break;

        case WebhookEvent.PAYMENT_FAILED:
          order.status = 'payment_failed';
          console.log(`❌ Order ${orderId} payment failed`);
          break;
      }
    },
    onError: (error) => {
      console.error('Webhook error:', error.message);
    },
  })
);

// ──────────────────────────────────────────
// GET /supported-blockchains — List options for the checkout UI
// ──────────────────────────────────────────
app.get('/supported-blockchains', (req, res) => {
  res.json({
    blockchains: Object.entries(Blockchain).map(([key, code]) => ({
      code,
      name: {
        BTC: 'Bitcoin',
        BCH: 'Bitcoin Cash',
        ETH: 'Ethereum',
        POL: 'Polygon',
        SOL: 'Solana',
        USDC_ETH: 'USDC (Ethereum)',
        USDC_POL: 'USDC (Polygon)',
        USDC_SOL: 'USDC (Solana)',
      }[code] || code,
    })),
  });
});

const PORT = process.env.PORT || 3002;
app.listen(PORT, () => {
  console.log(`🛒 E-commerce server running on port ${PORT}`);
  console.log();
  console.log('  POST /checkout                  — Create order + payment');
  console.log('  GET  /order/:id                 — Get order details');
  console.log('  GET  /order/:id/payment-status  — Check payment status');
  console.log('  POST /webhook                   — Tempest Touch webhook receiver');
  console.log('  GET  /supported-blockchains      — List crypto options');
});
