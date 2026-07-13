# Tempest Touch for WHMCS

A WHMCS payment gateway module that lets clients pay unpaid invoices through Tempest Touch hosted checkout (crypto or credit card).

## Installation

1. Copy the contents of the `modules/` folder into your WHMCS installation's `modules/` folder, preserving structure:
   - `modules/gateways/tempesttouch.php`
   - `modules/gateways/tempesttouch/lib/Tempest Touch/…`
   - `modules/gateways/callback/tempesttouch.php`
2. In WHMCS admin: **Setup → Payments → Payment Gateways → All Payment Gateways**, activate **Tempest Touch**.
3. Configure:
   - API key + Business ID (from Tempest Touch dashboard)
   - Webhook secret (create in Tempest Touch dashboard)
   - Payment mode: `both`, `crypto`, or `card`
4. In Tempest Touch dashboard, add the webhook URL shown in the gateway description:
   ```
   https://<your-whmcs>/modules/gateways/callback/tempesttouch.php
   ```

## Requirements

- WHMCS 8.x or newer
- PHP 7.4+
- `curl` and `hash` extensions (standard)

## How it works

- On an unpaid invoice, the gateway creates a Tempest Touch hosted checkout session and renders a **Pay with Tempest Touch** button.
- The client is redirected to Tempest Touch to complete payment.
- Tempest Touch POSTs a signed webhook to `/modules/gateways/callback/tempesttouch.php`.
- The callback verifies the HMAC signature, resolves the invoice from `metadata.invoice_id`, and calls `addInvoicePayment()` on success.
- Duplicate events are suppressed via `checkCbTransID()`.

## Files

| File | Role |
|------|------|
| `modules/gateways/tempesttouch.php` | Gateway module entrypoint (meta + config + link) |
| `modules/gateways/tempesttouch/lib/Tempest Touch/` | Vendored Tempest Touch PHP client (source of truth: `packages/tempesttouch-php/`) |
| `modules/gateways/callback/tempesttouch.php` | Webhook receiver |

## Refunds

Tempest Touch refunds are initiated from the Tempest Touch dashboard in MVP. When a refund is issued, Tempest Touch emits a `payment.refunded` webhook which the callback logs. Full WHMCS-side refund wiring is Phase 2.

## Debug logging

Toggle **Debug logging** in the gateway config. Logs are written to **Utilities → Logs → Gateway Log**.
