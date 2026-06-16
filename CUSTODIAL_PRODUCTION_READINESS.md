# Custodial USDT MVP Production Readiness

This document captures the production-ready custodial wallet layer added for the BlackPayments USDT MVP.

## MVP scope

The custodial MVP focuses on:

- Account creation and secure login through Supabase Auth
- Platform-held keys for TRON TRC-20, Ethereum ERC-20, and BNB Chain BEP-20 USDT
- Server-side deposit address generation
- Server-side withdrawals with idempotency and per-user withdrawal locks
- Basic balance display and transaction history
- Node health checks for the supported chains

TRON TRC-20 remains the primary chain for consumer payments because of low fees and fast block times.

## Environment variables

Copy `.env.example` to `.env.local` and configure:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

TRON_RPC_URL=https://your-private-tron-rpc
TRON_FULL_NODE=https://your-private-tron-full-node
TRON_SOLIDITY_NODE=https://your-private-tron-solidity-node
TRON_EVENT_SERVER=https://your-private-tron-event-server

CUSTODIAL_KEY_MANAGER_MODE=local-hd
CUSTODIAL_MASTER_SEED=dev-only-mnemonic

REDIS_REST_URL=https://your-redis-rest-url
REDIS_REST_TOKEN=your-redis-rest-token
```

Production must not use `CUSTODIAL_KEY_MANAGER_MODE=local-hd`. Use an HSM/KMS adapter and set:

```env
CUSTODIAL_KEY_MANAGER_MODE=http-hsm
CUSTODIAL_HSM_BASE_URL=https://hsm.example.internal
CUSTODIAL_HSM_TOKEN=your-hsm-api-token
```

## Key management

Custodial key management is abstracted behind [`createCustodialKeyManager()`](src/lib/custodialKeyManager.ts:181) and [`createCustodialKeyManagerFromEnv()`](src/lib/custodialKeyManager.ts:202).

- Development: local HD derivation from `CUSTODIAL_MASTER_SEED`
- Production: HTTP HSM adapter with signed/broadcast endpoints
- Custom integrations: pass an `HSMClient` adapter to `createCustodialKeyManager()`

The production guard in [`assertCustodyReady()`](src/lib/custodyPolicy.ts:112) rejects local HD custody when `NODE_ENV=production`.

## Ledger schema

Run [`src/supabase/schema.sql`](src/supabase/schema.sql:1) or the reset script for a fresh environment. The custodial ledger adds:

- `custody_addresses`
- `custodial_withdrawals`
- `custodial_deposits`
- `custody_balances`

The schema enforces MVP chains (`tron`, `ethereum`, `bsc`), idempotency keys, RLS policies, and realtime subscriptions for withdrawals, deposits, and custody addresses.

## Redis/idempotency primitives

[`src/lib/redis.ts`](src/lib/redis.ts:1) provides Redis-backed primitives with in-memory fallback:

- `WithdrawalLock`
- `IdempotencyStore`
- `RateLimiter`

Redis is optional for local development, but production should configure `REDIS_REST_URL` and `REDIS_REST_TOKEN` or equivalent Upstash variables.

## API routes

- `POST /api/custodial/addresses` creates or returns a deposit/withdrawal address
- `GET /api/custodial/addresses` lists custody addresses
- `GET /api/custodial/balances` returns USDT/native balances for custody deposit addresses
- `POST /api/custodial/withdraw` submits an idempotent withdrawal
- `GET /api/custodial/history` returns withdrawals and deposits
- `GET /api/custodial/health` and `GET /api/health` return custody, Redis, Supabase, and node readiness

## Production checklist

Before enabling real funds:

1. Run the Supabase schema migration.
2. Configure private RPC endpoints for TRON, Ethereum, and BNB Chain.
3. Replace local HD custody with HSM/KMS.
4. Configure Redis or Upstash Redis for locks and idempotency.
5. Confirm `/api/health` returns `ok: true`.
6. Review withdrawal limits, compliance, monitoring, and manual approval workflows.
