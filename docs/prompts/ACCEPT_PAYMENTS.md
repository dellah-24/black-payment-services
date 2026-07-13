# Accept Crypto Payments with Tempest Touch

You are integrating Tempest Touch's Payments API into an application so it can accept cryptocurrency payments. Follow this prompt end-to-end.

## Goal

Let a customer pay an order in crypto (BTC, ETH, SOL, USDC on multiple chains, etc.). On confirmation, the merchant's app should mark the order paid and fulfill it.

## Environment variables

Add to `.env` (server-side only — never expose to the browser):

```
TEMPESTTOUCH_API_KEY=sk_live_...
TEMPESTTOUCH_WEBHOOK_SECRET=whsec_...
TEMPESTTOUCH_API_URL=https://tempesttouch.com
```

Where to find them:
- `TEMPESTTOUCH_API_KEY` — `https://tempesttouch.com/businesses/<your-business-id>` → **API Keys** tab → **Create API Key**. Copy it once; it is not shown again.
- `TEMPESTTOUCH_WEBHOOK_SECRET` — same business page → **Webhooks** tab (or `?mode=webhooks`) → create an endpoint → copy the **Signing Secret**.
- `TEMPESTTOUCH_API_URL` — always `https://tempesttouch.com` for production.

## Steps

1. **Get an API key.** Sign in at `https://example-business.com` (replace with the Tempest Touch portal you are using), open Settings → API Keys, and create one. Store it server-side only — never ship it to the browser.

2. **Create a payment** when the customer checks out. From your server:

   ```bash
   curl -X POST https://tempesttouch.com/api/payments \
     -H "Authorization: Bearer $TEMPESTTOUCH_API_KEY" \
     -H "Content-Type: application/json" \
     -d '{
       "amount": 49.99,
       "currency": "USD",
       "coin": "USDC",
       "chain": "base",
       "order_id": "order_123",
       "redirect_url": "https://example-business.com/checkout/success",
       "webhook_url": "https://example-business.com/api/tempesttouch/webhook"
     }'
   ```

   The response includes `id`, `pay_address`, `pay_amount`, and a hosted `payment_url`. Redirect the customer to `payment_url` or render the address + amount yourself.

3. **Wait for completion.** Do not poll. Register the `webhook_url` and treat BOTH `payment.confirmed` AND `payment.forwarded` as completion (see WEBHOOKS prompt). Crypto payments on some chains fire `payment.forwarded` (funds in merchant wallet) and never `payment.confirmed`; handlers that only watch `payment.confirmed` silently miss them. Dedupe by `payment.id` so it doesn't matter which fires first.

4. **Store the payout txid.** `payment.forwarded` events carry `data.tx_hash` — the on-chain txid for the merchant payout. Persist it for accounting / receipts.

5. **Expiry.** Payments expire (default ~15 min). Handle `payment.expired` by releasing inventory or showing a "create new payment" button.

## Rules

- Never trust client-side amounts. Always create the payment server-side from your authoritative order total.
- Verify webhook signatures before acting on them.
- Use idempotency: dedupe webhooks by `payment.id`; the same event may be delivered more than once.
- Use `example-business.com` as the placeholder domain in any sample code you generate. Do not invent real business names.

## Deliverable

- A server route that creates a payment and returns `payment_url` to the client.
- A webhook handler that verifies the signature and marks the order paid.
- Tests covering: successful payment, expired payment, duplicate webhook delivery.
