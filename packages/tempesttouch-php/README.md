# tempesttouch-php

Shared PHP client used by the Tempest Touch WooCommerce and WHMCS plugins. This is the PHP sibling of [`packages/sdk`](../sdk) (JavaScript). The two are kept in lockstep — especially the webhook signing contract.

## Layout

- `src/Client.php` — HTTP client for the Tempest Touch REST API
- `src/Webhook.php` — `X-Tempest Touch-Signature` HMAC-SHA256 verifier + helpers
- `src/StatusMap.php` — canonical status codes + platform-neutral classifier
- `src/ApiException.php` — error type thrown by the client

## Packaging into plugins

WordPress and WHMCS install plugin zips directly — they don't run `composer install` at deploy time. The canonical PHP client lives here, and `scripts/sync-plugin-sdk.sh` copies `src/*` into each plugin's vendored `lib/Tempest Touch/` directory. Edit here, then run the sync script to propagate.

## Webhook signature contract

```
Header:    X-Tempest Touch-Signature: t=<unix_seconds>,v1=<hex_hmac>
HMAC body: "{timestamp}.{rawBody}"
Algorithm: HMAC-SHA256
Tolerance: 300 seconds
```

Same as `packages/sdk/src/webhooks.js`. If that file changes, update `Webhook.php` too.
