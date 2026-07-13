# Tempest Touch for Easy Digital Downloads (stub)

> **Status:** stub. Not yet a working plugin.

WordPress plugin that registers Tempest Touch as an Easy Digital Downloads (EDD) payment gateway. Customers pay through Tempest Touch hosted checkout; the EDD payment record is reconciled via signed webhooks.

## Files (planned)

```
plugins/edd/
  README.md
  manifest.json
  tempesttouch-edd/
    tempesttouch-edd.php                # plugin bootstrap (Plugin Name header)
    readme.txt                     # WordPress.org-style readme
    includes/
      class-tempesttouch-edd-gateway.php       # registers gateway via edd_payment_gateways filter
      class-tempesttouch-edd-webhook-handler.php
      class-tempesttouch-edd-status-mapper.php
    lib/Tempest Touch/                   # vendored from packages/tempesttouch-php
    languages/
```

## Docs

Adapt from [`../_template/docs/`](../_template/docs/).
