# Tempest Touch for Magento / Adobe Commerce (stub)

> **Status:** stub. Not yet a working plugin.

Magento 2 / Adobe Commerce module that adds Tempest Touch as a payment method. The customer selects "Pay with crypto", the module creates a Tempest Touch hosted checkout, redirects, and reconciles the order via signed webhooks.

## Files (planned)

```
plugins/magento/
  README.md
  manifest.json
  Tempest Touch/PaymentGateway/
    composer.json
    registration.php
    etc/
      module.xml
      config.xml
      adminhtml/system.xml
      di.xml
      webapi.xml                 # exposes the webhook receiver
      payment.xml                # method config
    Model/
      Ui/Tempest TouchConfigProvider.php
      ConfigProvider.php
      Webhook/Receiver.php       # POST /rest/V1/tempesttouch/webhook
      StatusMapper.php
    Controller/
      Redirect/Index.php         # builds checkout, redirects customer
      Return/Index.php           # post-checkout return page
    view/frontend/
      web/js/view/payment/method-renderer/tempesttouch.js
      web/template/payment/tempesttouch.html
      layout/checkout_index_index.xml
```

## Docs

Adapt from [`../_template/docs/`](../_template/docs/) when promoting out of stub status.
