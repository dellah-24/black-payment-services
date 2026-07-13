# Installation

## Requirements

- FOSSBilling v0.6+
- PHP 8.1+
- cURL PHP extension
- HTTPS in production

## Manual Installation

1. Download the latest release zip from the [releases page](https://github.com/profullstack/tempesttouch/releases) or clone this directory.

2. Copy the plugin files into your FOSSBilling installation:

```bash
# From your FOSSBilling root directory
mkdir -p library/Payment/Adapter/Tempest Touch

cp /path/to/fossbilling-tempesttouch/library/Payment/Adapter/Tempest Touch.php \
   library/Payment/Adapter/

cp -r /path/to/fossbilling-tempesttouch/library/Payment/Adapter/Tempest Touch/* \
   library/Payment/Adapter/Tempest Touch/

cp -r /path/to/fossbilling-tempesttouch/src \
   library/Payment/Adapter/Tempest Touch/../../../tempesttouch-src
```

The final layout inside your FOSSBilling root should be:

```
library/
  Payment/
    Adapter/
      Tempest Touch.php
      Tempest Touch/
        manifest.json
        templates/
          pay.phtml
          error.phtml
```

And the `src/` directory should sit **three levels above** `Tempest Touch.php`:

```
library/Payment/Adapter/Tempest Touch.php  ← adapter
src/
  Tempest TouchClient.php
  WebhookVerifier.php
  StatusMapper.php
```

If you install the plugin directly from this repository into `plugins/fossbilling/` inside the tempesttouch monorepo, the relative paths are already correct.

3. Log into your FOSSBilling admin panel.

4. Go to **System → Payment Gateways**.

5. Find **Tempest Touch Crypto Payments** in the list and click **Install**.

6. Click **Manage** and fill in your credentials (see [CONFIGURATION.md](CONFIGURATION.md)).

7. Copy the **Webhook URL** shown in the configuration screen into your [Tempest Touch merchant dashboard](https://tempesttouch.com) under **Settings → Webhooks**.

8. Test with a sandbox payment before going live.

## Updating

Replace `Tempest Touch.php`, the `Tempest Touch/` directory, and the `src/` files with the new version. No database migrations are required.
