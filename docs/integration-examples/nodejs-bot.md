# Integration Example: Node.js Payment Bot

A Discord/Telegram-style bot that creates crypto invoices and monitors payment status. Works as a standalone script or module in your existing project.

---

## Full Working Example

```javascript
// payment-bot.mjs
// A simple payment bot that creates invoices and waits for payment

import { Tempest TouchClient, Blockchain, WebhookEvent, verifyWebhookSignature, parseWebhookPayload } from '@profullstack/tempesttouch';
import http from 'http';

// ─── Configuration ──────────────────────────────────────────────────────
const TEMPESTTOUCH_API_KEY = process.env.TEMPESTTOUCH_API_KEY;
const TEMPESTTOUCH_WEBHOOK_SECRET = process.env.TEMPESTTOUCH_WEBHOOK_SECRET;
const BUSINESS_ID = process.env.TEMPESTTOUCH_BUSINESS_ID;
const WEBHOOK_PORT = process.env.WEBHOOK_PORT || 4000;

if (!TEMPESTTOUCH_API_KEY || !BUSINESS_ID) {
  console.error('Set TEMPESTTOUCH_API_KEY and TEMPESTTOUCH_BUSINESS_ID environment variables');
  process.exit(1);
}

const client = new Tempest TouchClient({ apiKey: TEMPESTTOUCH_API_KEY });

// ─── In-memory order store (use a DB in production) ─────────────────────
const orders = new Map();

// ─── Create an invoice ──────────────────────────────────────────────────
async function createInvoice(orderId, amountUsd, chain = 'BTC', customerEmail = null) {
  console.log(`\n📝 Creating invoice for Order #${orderId}: $${amountUsd} in ${chain}`);

  const result = await client.createPayment({
    businessId: BUSINESS_ID,
    amount: amountUsd,
    currency: 'USD',
    blockchain: chain,
    description: `Order #${orderId}`,
    metadata: {
      orderId,
      customerEmail,
      createdBy: 'payment-bot',
    },
  });

  const payment = result.payment;

  // Store order → payment mapping
  orders.set(payment.id, { orderId, amountUsd, chain, status: 'pending' });

  console.log(`✅ Invoice created!`);
  console.log(`   Payment ID:  ${payment.id}`);
  console.log(`   Address:     ${payment.payment_address}`);
  console.log(`   Amount:      ${payment.crypto_amount || payment.amount_crypto} ${chain}`);
  console.log(`   Expires:     ${payment.expires_at}`);
  console.log(`   QR Code:     ${client.getPaymentQRUrl(payment.id)}`);

  return payment;
}

// ─── Poll for payment (simple approach) ─────────────────────────────────
async function waitForPayment(paymentId) {
  console.log(`\n⏳ Waiting for payment ${paymentId}...`);

  try {
    const result = await client.waitForPayment(paymentId, {
      interval: 5000,       // check every 5 seconds
      timeout: 600000,      // timeout after 10 minutes
      onStatusChange: (status, payment) => {
        console.log(`   Status changed: ${status}`);
        if (orders.has(paymentId)) {
          orders.get(paymentId).status = status;
        }
      },
    });

    const finalStatus = result.payment.status;

    if (finalStatus === 'confirmed' || finalStatus === 'forwarded') {
      console.log(`\n🎉 Payment confirmed!`);
      fulfillOrder(paymentId);
    } else if (finalStatus === 'expired') {
      console.log(`\n⏰ Payment expired.`);
      cancelOrder(paymentId);
    } else {
      console.log(`\n❌ Payment ended with status: ${finalStatus}`);
    }

    return result;
  } catch (error) {
    console.error(`\n💥 Error waiting for payment:`, error.message);
  }
}

// ─── Webhook handler (production approach) ──────────────────────────────
function startWebhookServer() {
  const server = http.createServer(async (req, res) => {
    if (req.method !== 'POST' || req.url !== '/webhooks/tempesttouch') {
      res.writeHead(404);
      res.end('Not found');
      return;
    }

    // Read raw body
    const chunks = [];
    for await (const chunk of req) {
      chunks.push(chunk);
    }
    const rawBody = Buffer.concat(chunks).toString();

    // Verify signature
    const signature = req.headers['x-tempesttouch-signature'];
    if (TEMPESTTOUCH_WEBHOOK_SECRET && signature) {
      const isValid = verifyWebhookSignature({
        payload: rawBody,
        signature,
        secret: TEMPESTTOUCH_WEBHOOK_SECRET,
      });

      if (!isValid) {
        console.warn('⚠️  Invalid webhook signature — rejecting');
        res.writeHead(401);
        res.end('Invalid signature');
        return;
      }
    }

    // Parse and handle
    try {
      const event = parseWebhookPayload(rawBody);
      console.log(`\n📬 Webhook received: ${event.type}`);

      switch (event.type) {
        case WebhookEvent.PAYMENT_COMPLETED:
        case 'payment.confirmed':
          console.log(`   Payment ${event.data.payment_id} confirmed!`);
          console.log(`   Amount: $${event.data.amount_usd} (${event.data.amount_crypto} ${event.data.currency})`);
          fulfillOrder(event.data.payment_id);
          break;

        case WebhookEvent.PAYMENT_EXPIRED:
        case 'payment.expired':
          console.log(`   Payment ${event.data.payment_id} expired.`);
          cancelOrder(event.data.payment_id);
          break;

        case 'payment.forwarded':
          console.log(`   Funds forwarded for ${event.data.payment_id}`);
          break;

        default:
          console.log(`   Unhandled event: ${event.type}`);
      }

      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ received: true }));
    } catch (error) {
      console.error('Error processing webhook:', error.message);
      res.writeHead(500);
      res.end('Error');
    }
  });

  server.listen(WEBHOOK_PORT, () => {
    console.log(`🌐 Webhook server listening on port ${WEBHOOK_PORT}`);
    console.log(`   Configure your webhook URL as: https://yourserver.com/webhooks/tempesttouch`);
  });

  return server;
}

// ─── Order fulfillment (your business logic goes here) ──────────────────
function fulfillOrder(paymentId) {
  const order = orders.get(paymentId);
  if (!order) return;

  order.status = 'fulfilled';
  console.log(`   📦 Fulfilling Order #${order.orderId} ($${order.amountUsd})`);
  // TODO: Update your database, send confirmation email, grant access, etc.
}

function cancelOrder(paymentId) {
  const order = orders.get(paymentId);
  if (!order) return;

  order.status = 'cancelled';
  console.log(`   🚫 Cancelled Order #${order.orderId}`);
  // TODO: Notify customer, release inventory, etc.
}

// ─── Main ───────────────────────────────────────────────────────────────
async function main() {
  console.log('🤖 Tempest Touch Payment Bot');
  console.log('────────────────────────');

  // Start webhook server in background
  startWebhookServer();

  // Example: Create an invoice and wait for it
  const payment = await createInvoice(
    'ORD-001',            // order ID
    25.00,                // USD amount
    Blockchain.ETH,       // pay with ETH
    'customer@example.com'
  );

  // Wait for payment (polling approach — use webhooks in production)
  await waitForPayment(payment.id);
}

main().catch(console.error);
```

---

## Running It

```bash
# Set environment variables
export TEMPESTTOUCH_API_KEY="cp_live_your_key"
export TEMPESTTOUCH_BUSINESS_ID="your-business-uuid"
export TEMPESTTOUCH_WEBHOOK_SECRET="whsec_your_secret"  # optional

# Run the bot
node payment-bot.mjs
```

**Output:**
```
🤖 Tempest Touch Payment Bot
────────────────────────
🌐 Webhook server listening on port 4000

📝 Creating invoice for Order #ORD-001: $25 in ETH
✅ Invoice created!
   Payment ID:  pay_550e8400-e29b-41d4-a716-446655440000
   Address:     0x7a1b2c3d4e5f...
   Amount:      0.00723 ETH
   Expires:     2025-01-15T11:30:00.000Z
   QR Code:     https://tempesttouch.com/api/payments/pay_550.../qr

⏳ Waiting for payment pay_550e8400...
   Status changed: confirmed
🎉 Payment confirmed!
   📦 Fulfilling Order #ORD-001 ($25)
```

---

## Adapting This for Your Bot

### Discord Bot

```javascript
// Inside your Discord command handler
client.on('messageCreate', async (message) => {
  if (message.content.startsWith('!pay')) {
    const [, amountStr, chain] = message.content.split(' ');
    const amount = parseFloat(amountStr);

    const payment = await createInvoice(
      `discord-${message.id}`,
      amount,
      chain || 'BTC',
      null
    );

    await message.reply({
      embeds: [{
        title: '💰 Payment Invoice',
        description: `Send **${payment.crypto_amount} ${chain || 'BTC'}** to:`,
        fields: [
          { name: 'Address', value: `\`${payment.payment_address}\`` },
          { name: 'Expires', value: payment.expires_at },
        ],
        image: { url: tempesttouch.getPaymentQRUrl(payment.id) },
      }],
    });

    // Monitor in background
    waitForPayment(payment.id).then(() => {
      message.reply('✅ Payment received! Your order is being processed.');
    });
  }
});
```

### Telegram Bot

```javascript
bot.command('pay', async (ctx) => {
  const [amount, chain] = ctx.message.text.split(' ').slice(1);
  
  const payment = await createInvoice(
    `tg-${ctx.message.message_id}`,
    parseFloat(amount),
    chain || 'BTC'
  );

  await ctx.replyWithPhoto(
    tempesttouch.getPaymentQRUrl(payment.id),
    {
      caption: `Send ${payment.crypto_amount} ${chain || 'BTC'} to:\n\`${payment.payment_address}\``,
      parse_mode: 'Markdown',
    }
  );
});
```

---

## Production Tips

1. **Use webhooks** instead of polling — polling is fine for testing but webhooks are more reliable
2. **Store orders in a database** (Postgres, Redis, etc.) — not an in-memory Map
3. **Always verify webhook signatures** — prevents spoofed payment confirmations
4. **Set `redirect_url`** in payment metadata to redirect customers after payment
5. **Handle idempotency** — webhooks may be delivered more than once
