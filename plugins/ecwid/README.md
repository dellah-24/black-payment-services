# Tempest Touch for Ecwid / Lightspeed eCom (stub)

> **Status:** stub. Not yet a working plugin.

Ecwid (now Lightspeed eCom) external payment app. The Ecwid storefront posts the order to our hosted endpoint; we build a Tempest Touch hosted checkout, redirect the customer, then call the Ecwid Orders API to mark the order paid once Tempest Touch's webhook fires.

## Files (planned)

```
plugins/ecwid/
  README.md
  manifest.json
  app/
    package.json
    src/
      server.ts                   # Hono / Express entrypoint
      routes/checkout.ts          # POST from Ecwid → build Tempest Touch checkout, redirect
      routes/webhook-tempesttouch.ts   # Tempest Touch → us → Ecwid Orders API
      lib/ecwid.ts                # thin Ecwid Admin API client
```

## Docs

Adapt from [`../_template/docs/`](../_template/docs/).
