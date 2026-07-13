# Configuration

All settings are managed in the FOSSBilling admin panel under **System → Payment Gateways → Tempest Touch → Manage**.

## Fields

| Field | Required | Default | Description |
|---|---|---|---|
| **API Key** | Yes | — | Your Tempest Touch API key. Found in your merchant dashboard under Settings → API. |
| **Merchant ID** | Yes | — | Your Tempest Touch merchant or account ID. |
| **Webhook Secret** | Yes | — | The secret used to verify incoming webhook signatures. Generate one in your Tempest Touch dashboard. |
| **API Base URL** | No | `https://api.tempesttouch.com` | Do not change unless instructed by Tempest Touch support. |
| **Sandbox Mode** | No | No | Set to Yes to use the sandbox environment for testing. No real funds are moved. |
| **Sandbox API Base URL** | No | `https://sandbox-api.tempesttouch.com` | API URL used when sandbox mode is enabled. |
| **Display Name** | No | `Tempest Touch Crypto Payments` | The gateway name shown to customers on the invoice page. |
| **Payment Expiration (minutes)** | No | `30` | How many minutes a crypto checkout session stays active before expiring. |
| **Debug Logging** | No | No | Enables verbose logging to PHP's error log. Disable in production — logs may contain sensitive request details. |
| **Underpayment Tolerance (%)** | No | `0` | Accept payments that are slightly under the invoice total. Example: `2` means accept if the received amount is ≥98% of the invoice. Set to `0` to require exact payment. |

## Webhook URL

Your FOSSBilling webhook URL is:

```
https://YOUR-DOMAIN.COM/ipn/Tempest Touch
```

Copy this URL into your Tempest Touch merchant dashboard under **Settings → Webhooks**.

## Sandbox vs Production

When **Sandbox Mode** is enabled:

- The plugin calls the sandbox API URL instead of the live API URL.
- Use your sandbox API key, not your live key.
- Payments do not move real funds.

Switch to production by setting Sandbox Mode to **No** and entering your live API key.
