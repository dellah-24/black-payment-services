# MVP Custodial TRON USDT Wallet Plan

This document records the MVP direction for BlackPayments Wallet based on the development pointers: custodial wallet model, essential USDT features, TypeScript/Next.js stack, PostgreSQL/Supabase storage, Redis-ready caching, and TRON/TRC-20-first blockchain support.

## Chosen MVP scope

### Wallet type

- **Custodial wallet**: BlackPayments operates and safeguards wallet keys on behalf of users.
- The app should not expose seed phrases or private keys to end users in the MVP UI.
- Production deployments should move key custody to a hardened backend service or HSM/KMS-backed signer.

### Core MVP features

1. **Account creation**
   - Supabase Auth profile is linked to a custodial wallet address.
   - Wallet creation is centralized so the platform can manage keys and transaction policy.

2. **Secure login**
   - Supabase Auth remains the authentication layer.
   - Session state gates wallet pages and wallet operations.

3. **Receive USDT**
   - Display the user's deposit address as a QR code.
   - For MVP, default to **TRON TRC-20 USDT**.

4. **Send USDT**
   - Validate recipient address by chain.
   - Validate amount against available USDT balance.
   - Broadcast through the custodial signer path.
   - Record transaction history locally now, and in PostgreSQL in production.

5. **Basic balance display**
   - Display USDT balance and native gas asset balance.
   - TRON display should show USDT plus TRX for fee/resource coverage.

6. **Transaction history**
   - Show send/receive status, amount, counterparties, timestamp, and explorer link.
   - Persist canonical history server-side for production.

## Technology stack mapping

| Layer | MVP choice | Current project mapping |
| --- | --- | --- |
| Backend/runtime | Node.js with TypeScript | Next.js TypeScript app with route handlers and shared TypeScript libraries |
| Frontend | React / Next.js App Router | `src/app/*` pages and React hooks |
| Database | PostgreSQL | Supabase PostgreSQL schema in [`src/supabase/schema.sql`](src/supabase/schema.sql:1) |
| Cache/session acceleration | Redis-ready | Add Redis or Upstash Redis when moving transaction indexing and rate limits out of the browser |
| EVM interaction | ethers.js v6 | Existing EVM wallet classes and send flow |
| TRON interaction | tronweb.js | New [`src/lib/tronWallet.ts`](src/lib/tronWallet.ts:1) helpers |

## Primary blockchain

**TRON TRC-20 USDT** is the MVP primary chain because:

- USDT liquidity is high on TRON.
- Transaction fees are typically far lower than Ethereum mainnet.
- Block times are fast and the UX is suitable for consumer payments.

Secondary chains remain configured for future expansion:

- BNB Chain BEP-20 for low-fee EVM users.
- Ethereum ERC-20 for institutional/exchange compatibility.
- Additional EVM networks can be enabled after TRON MVP stability.

## Implemented TRON/TRC-20 primitives

The following primitives were added or updated to align the codebase with the MVP plan:

- [`src/lib/tronWallet.ts`](src/lib/tronWallet.ts:1)
  - Creates TRON web clients.
  - Validates and formats TRON addresses/amounts.
  - Fetches TRC-20 USDT and TRX balances.
  - Sends TRC-20 USDT using TronWeb.
  - Reads TRON transaction status.
  - Builds TronScan explorer links.

- [`src/lib/walletUtils.ts`](src/lib/walletUtils.ts:1)
  - TRON fee estimates now use realistic TRC-20 fee-limit ranges.
  - TRON transaction status uses TronWeb instead of a hardcoded confirmed status.
  - Balance and explorer helpers are chain-aware.

- [`src/app/send/page.tsx`](src/app/send/page.tsx:1)
  - TRON is no longer blocked on the send page.
  - Recipient validation uses TRON address rules for TRC-20.
  - TRC-20 balance is fetched from the blockchain.
  - TRC-20 sends use the TronWeb signer path.
  - Explorer links are generated per chain.

- [`src/hooks/useWalletBalance.ts`](src/hooks/useWalletBalance.ts:1)
  - TRON balances now fetch real USDT and TRX values instead of showing zero.

- [`src/wallet/BlackPaymentsWallet.ts`](src/wallet/BlackPaymentsWallet.ts:1)
  - The shared wallet class can initialize TRON alongside EVM chains.
  - TRON balance, send, quote, status, and gas-rate paths are implemented.

## Custodial production notes

The current browser-facing code is suitable for MVP/client integration, but true custodial production behavior requires server-side custody:

1. Generate and store wallet keys in a secure backend, HSM, KMS, or MPC signer.
2. Never return private keys to the browser.
3. Require server-side authorization, withdrawal limits, address allowlists, and audit logging.
4. Store canonical transaction records in PostgreSQL.
5. Use Redis/Upstash for rate limits, nonce locks, pending withdrawal state, and webhook/idempotency caches.
6. Add TRON webhook/indexer polling to credit deposits after sufficient confirmations.

## MVP acceptance checklist

- [x] TRON TRC-20 is the recommended default chain in the send UI.
- [x] TRC-20 USDT balance can be fetched.
- [x] TRON recipient address validation is enforced.
- [x] TRC-20 USDT send path is implemented with TronWeb.
- [x] TRON transaction status and explorer links are chain-aware.
- [x] Balance polling supports TRON USDT and TRX.
- [ ] Server-side custodial key generation and signing endpoint implemented.
- [ ] PostgreSQL transaction ledger populated for all wallet events.
- [ ] Redis-backed rate limits and nonce/withdrawal locks implemented.
- [ ] Deposit webhook/indexer credits receive history automatically.
