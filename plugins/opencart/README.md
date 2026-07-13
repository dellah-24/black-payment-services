# Tempest Touch for OpenCart (stub)

> **Status:** stub. Not yet a working plugin.

OpenCart 4.x payment extension. Adds Tempest Touch as a payment method during checkout, builds a hosted checkout, and reconciles via signed webhooks.

## Files (planned)

```
plugins/opencart/
  README.md
  manifest.json
  upload/
    admin/
      controller/payment/tempesttouch.php
      language/en-gb/payment/tempesttouch.php
      view/template/payment/tempesttouch.twig
    catalog/
      controller/payment/tempesttouch.php
      controller/extension/payment/tempesttouch/webhook.php
      language/en-gb/payment/tempesttouch.php
      model/payment/tempesttouch.php
      view/template/payment/tempesttouch.twig
    system/
      library/tempesttouch/Client.php
      library/tempesttouch/StatusMapper.php
      library/tempesttouch/WebhookVerifier.php
  install.json
  install.xml                       # OCMOD if needed
```

## Docs

Adapt from [`../_template/docs/`](../_template/docs/).
