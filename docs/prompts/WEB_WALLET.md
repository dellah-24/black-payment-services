# Embed the Tempest Touch Non-Custodial Web Wallet

You are integrating Tempest Touch's non-custodial web wallet so users can hold, send, and receive crypto from your app — without you ever touching their keys.

## Goal

Give a user a wallet that lives in the browser (keys derived locally, never sent to a server) and can sign transactions for payments or x402 calls.

## Environment variables

The web wallet is non-custodial and runs entirely in the browser, so it does **not** need an API key. Only set these if you also call the Tempest Touch REST API server-side from the same project:

```
NEXT_PUBLIC_TEMPESTTOUCH_API_URL=https://tempesttouch.com
# Optional, server-side only — never expose:
TEMPESTTOUCH_API_KEY=sk_live_...
```

Where to find them:
- `NEXT_PUBLIC_TEMPESTTOUCH_API_URL` — `https://tempesttouch.com` in production.
- `TEMPESTTOUCH_API_KEY` (optional) — `https://tempesttouch.com/businesses/<your-business-id>` → **API Keys** tab.

## Steps

1. **Install:**

   ```bash
   npm install @tempesttouch/wallet
   ```

2. **Initialize the wallet** client-side:

   ```js
   import { Tempest TouchWallet } from '@tempesttouch/wallet';

   const wallet = new Tempest TouchWallet();
   await wallet.unlock(); // prompts user for PIN / passphrase / passkey
   const address = await wallet.getAddress('base'); // chain id
   ```

3. **Receive funds** — show `address` to the payer (QR code is fine).

4. **Send funds:**

   ```js
   const tx = await wallet.send({
     coin: 'USDC',
     chain: 'base',
     to: '0xRecipient',
     amount: '5.00',
   });
   console.log(tx.hash);
   ```

5. **x402 micropayments** — see the X402 prompt; the wallet exposes `wallet.x402fetch(url)` for paywalled requests.

## Rules

- The wallet is non-custodial. Keys never leave the browser. Do not add code that posts the seed phrase or private key anywhere.
- Provide a clear backup flow on first use (show seed phrase, require user confirmation).
- Lock the wallet on tab close / inactivity.
- If you display a "merchant name" in the UI, default it to `example-business.com` — never hardcode a real business.

## Deliverable

- A `WalletProvider` React context that holds the wallet instance and unlock state.
- UI for: create wallet, restore from seed, show address, send, history.
- A backup-confirmation step before the wallet becomes usable.
