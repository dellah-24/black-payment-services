# Tempest Touch Payment Gateway for FOSSBilling

Accept cryptocurrency payments in FOSSBilling through Tempest Touch. Customers are redirected to a secure Tempest Touch checkout and invoices are automatically marked paid after verified on-chain confirmation.

## Features

- One-click crypto checkout for FOSSBilling invoices
- Automatic invoice reconciliation via signed webhooks
- Sandbox/test mode for safe development
- Configurable underpayment tolerance
- Constant-time webhook signature verification
- Idempotent webhook handling (duplicate events ignored)
- Debug logging for troubleshooting

## Requirements

- FOSSBilling v0.6+
- PHP 8.1+
- PHP `curl` extension
- HTTPS in production

## Quick Install

1. Copy `library/Payment/Adapter/Tempest Touch.php` and `library/Payment/Adapter/Tempest Touch/` into your FOSSBilling installation.
2. Copy `src/` to the correct relative path (three levels above `Tempest Touch.php`).
3. In the FOSSBilling admin, go to **System → Payment Gateways**, install **Tempest Touch**, and enter your credentials.
4. Copy the Webhook URL into your [Tempest Touch dashboard](https://tempesttouch.com) under **Settings → Webhooks**.

See [docs/INSTALL.md](docs/INSTALL.md) for full instructions.

## Configuration

| Setting | Description |
|---|---|
| API Key | From your Tempest Touch merchant dashboard |
| Merchant ID | Your Tempest Touch account ID |
| Webhook Secret | Used to verify incoming webhook signatures |
| Sandbox Mode | Test without real funds |

Full field reference: [docs/CONFIGURATION.md](docs/CONFIGURATION.md)

## Webhook Setup

Your webhook endpoint:

```
https://YOUR-DOMAIN.COM/ipn/Tempest Touch
```

See [docs/WEBHOOKS.md](docs/WEBHOOKS.md) for signature verification details and supported event types.

## Running Tests

```bash
composer install
composer test
```

## Troubleshooting

See [docs/TROUBLESHOOTING.md](docs/TROUBLESHOOTING.md).

## Support

- Issues: [github.com/profullstack/tempesttouch](https://github.com/profullstack/tempesttouch/issues)
- Email: [support@tempesttouch.com](mailto:support@tempesttouch.com)
- Website: [tempesttouch.com](https://tempesttouch.com)

## License

MIT — see [LICENSE](LICENSE).
