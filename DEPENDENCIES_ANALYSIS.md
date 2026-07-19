# Tempest Touch — Dependencies Analysis

> **Project**: Tempest Touch (tempesttouch.com)
> **Type**: Next.js 16 multi-chain payment infrastructure
> **Package Manager**: pnpm 10.32.1
> **Node Version**: >= 20.9.0
> **Analysis Date**: 2026-07-13
> **Deployment Target**: Cloudflare Workers (OpenNext for Cloudflare)

---

## 🚨 500 Error Diagnosis for `blackpayments.co.zw`

The `GET https://blackpayments.co.zw/ 500 (Internal Server Error)` and favicon 500 errors indicate the Cloudflare Pages Functions worker is crashing during request handling.

### Deployment Configuration

| Setting | Value | Source |
|---------|-------|--------|
| Platform | Cloudflare Workers (OpenNext for Cloudflare) | [`wrangler.toml`](wrangler.toml:1) |
| Worker Entry | `.open-next/worker.js` | [`wrangler.toml`](wrangler.toml:2) |
| Static Assets | `.open-next/assets` (ASSETS binding) | [`wrangler.toml`](wrangler.toml:30) |
| Compatibility | `nodejs_compat` | [`wrangler.toml`](wrangler.toml:4) |
| Adapter | `@opennextjs/cloudflare` | [`open-next.config.ts`](open-next.config.ts:1) |
| Build Script | `opennextjs-cloudflare build` | [`package.json`](package.json:33) |
| Deploy Script | `opennextjs-cloudflare deploy` (→ `wrangler deploy`) | [`package.json`](package.json:34) |

### Primary Suspects (Worker Crash on Every Request)

| Rank | Dependency / Module | Why It Causes 500 |
|------|---------------------|-------------------|
| 1 | [`@supabase/supabase-js`](src/lib/payments/monitor.ts:19) | `monitor.ts` reads `NEXT_PUBLIC_SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` at **module load time** with non-null assertions (`!`). If either is missing/undefined in Cloudflare's environment, the module throws during import, crashing the worker before any request is handled. |
| 2 | [`@opentelemetry/sdk-logs`](src/instrumentation.ts:10) | `instrumentation.ts` runs on server startup. If `POSTHOG_LOGS_AUTH_TOKEN` is set but the OTLP endpoint is unreachable, the `OTLPLogExporter` initialization can throw. |
| 3 | [`@profullstack/referrals`](src/app/layout.tsx:2) | The `ReferralProvider` is imported in the root layout. If this GitHub-sourced package has a broken build or incompatible React 19 peer dependency, it crashes the app tree. |
| 4 | Native crypto modules | `tiny-secp256k1`, `@emurgo/cardano-serialization-lib-nodejs` may fail in Cloudflare's V8 isolate environment. |
| 5 | Missing `ENCRYPTION_KEY` | Many modules throw if `ENCRYPTION_KEY` is not set (see below). |

### Root Cause Analysis

The 500 error on **both** `/` and `/icons/favicon.png` confirms a **worker crash**, not a client-side issue. The favicon redirect is configured in [`next.config.mjs`](next.config.mjs:87), but if the Cloudflare Worker crashes, all routes return 500.

**Most probable scenario**: Missing or misconfigured environment variables in Cloudflare. The [`src/lib/payments/monitor.ts`](src/lib/payments/monitor.ts:19) module is imported by [`src/instrumentation.ts`](src/instrumentation.ts:71) on worker startup, and it immediately accesses:
```ts
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
```

If these are undefined in Cloudflare's environment, the module throws, preventing the worker from initializing.

### Immediate Debugging Steps

1. **Check Cloudflare build logs**: Dashboard → Pages → Your project → Builds
2. **Check Cloudflare function logs**: Dashboard → Pages → Functions → Logs
3. **Verify env vars in Cloudflare**:
   ```bash
   wrangler secret list
   # or for Pages:
   wrangler pages project secret list
   ```
4. **Test build locally**:
   ```bash
   pnpm build:pages
   ```
5. **Temporarily disable instrumentation**:
   - Set `ENABLE_BACKGROUND_MONITOR=false`
   - Unset `POSTHOG_LOGS_AUTH_TOKEN`

---

## 1. Core Framework & Runtime

| Dependency | Version | Purpose |
|------------|---------|---------|
| [`next`](https://nextjs.org/) | 16.2.6 | React framework for SSR, SSG, API routes, and app router. The entire frontend and backend run on Next.js. |
| [`react`](https://react.dev/) | ^19.0.0 | UI library for building component-based interfaces. |
| [`react-dom`](https://react.dev/) | ^19.0.0 | React DOM renderer for web applications. |
| [`typescript`](https://www.typescriptlang.org/) | ^5.3.3 | Static type checking for JavaScript, ensuring code correctness across the large codebase. |
| [`dotenv`](https://github.com/motdotla/dotenv) | ^17.2.3 | Loads environment variables from `.env` files into `process.env`. Critical for configuration management. |

**Infrastructure Requirements**:
- **Node.js >= 20.9.0** — Required runtime for Next.js 16 and all crypto libraries.
- **pnpm** — Package manager with strict dependency resolution and workspace support.

---

## 2. Blockchain & Cryptography Libraries

| Dependency | Version | Purpose |
|------------|---------|---------|
| [`@emurgo/cardano-serialization-lib-nodejs`](https://github.com/Emurgo/cardano-serialization-lib) | ^15.0.3 | Cardano (ADA) address generation, transaction building, and serialization. |
| [`@noble/curves`](https://github.com/paulmillr/noble-curves) | ^2.0.1 | Elliptic curve operations (secp256k1, ed25519, etc.) for cryptographic signing across multiple chains. |
| [`@noble/ed25519`](https://github.com/paulmillr/noble-ed25519) | ^3.0.0 | Ed25519 signature scheme used for Solana and other Ed25519-based chains. |
| [`@noble/hashes`](https://github.com/paulmillr/noble-hashes) | ^2.0.1 | Cryptographic hash functions (SHA-256, SHA-512, RIPEMD-160, etc.) for address derivation and transaction hashing. |
| [`@scure/bip32`](https://github.com/paulmillr/scure-bip32) | ^1.3.3 | BIP-32 hierarchical deterministic (HD) key derivation for generating wallet trees from seed phrases. |
| [`@scure/bip39`](https://github.com/paulmillr/scure-bip39) | ^1.2.2 | BIP-39 mnemonic phrase generation and validation for wallet seed phrases. |
| [`bitcoinjs-lib`](https://github.com/bitcoinjs/bitcoinjs-lib) | ^6.1.5 | Bitcoin (BTC) and Bitcoin Cash (BCH) address generation, transaction creation, and script handling. |
| [`bs58`](https://github.com/cryptocoinjs/bs58) | ^6.0.0 | Base58 encoding/decoding used for Bitcoin and Solana address formats. |
| [`ecpair`](https://github.com/bitcoinjs/ecpair) | ^3.0.1 | Elliptic Curve key pair generation for Bitcoin (secp256k1). |
| [`ed25519-hd-key`](https://github.com/bcardin/ed25519-hd-key) | ^1.3.0 | HD key derivation for Ed25519 (used by Solana and Cardano). |
| [`ethers`](https://docs.ethers.org/) | ^6.10.0 | Ethereum (ETH, POL, BSC, BASE, ARB) address generation, transaction signing, and contract interaction. |
| [`tiny-secp256k1`](https://github.com/bitcoinjs/tiny-secp256k1) | ^2.2.4 | Optimized secp256k1 elliptic curve library for Bitcoin operations. |
| [`tweetnacl`](https://tweetnacl.js.org/) | ^1.0.3 | Fast cryptographic library for Ed25519 signatures (used in Solana and XRPL). |
| [`viem`](https://viem.sh/) | ^2.40.3 | Low-level Ethereum interface for TypeScript — used for EVM chain interactions (ETH, POL, BSC, etc.). |
| [`xrpl`](https://xrpl.org/) | ^4.6.0 | XRP Ledger (XRP) client library for address generation, transactions, and account management. |
| [`@grpc/grpc-js`](https://github.com/grpc/grpc-node) | ^1.14.4 | gRPC implementation for Node.js — used for Lightning Network (Greenlight) communication. |
| [`@grpc/proto-loader`](https://github.com/grpc/grpc-node) | ^0.8.0 | Loads Protocol Buffer definitions for gRPC services (Lightning node RPC). |

**External Service Dependencies** (from `.env.example`):
- **Alchemy** or **Infura** — Ethereum/Polygon RPC providers (`ETHEREUM_RPC_URL`, `POLYGON_RPC_URL`, etc.)
- **Bitcoin RPC** — Self-hosted or third-party Bitcoin node (`BITCOIN_RPC_URL`)
- **Solana RPC** — Solana mainnet/beta RPC endpoint (`SOLANA_RPC_URL`)
- **Blockstream API** — Bitcoin explorer and broadcast (`BLOCKSTREAM_CLIENT_ID`, `BLOCKSTREAM_CLIENT_SECRET`)
- **Crypto APIs** — Multi-chain block explorer for BCH and others (`CRYPTO_APIS_KEY`)
- **Etherscan / Polygonscan / BSCScan** — Transaction indexing and verification (`ETHERSCAN_API_KEY`, `POLYGONSCAN_API_KEY`, `BSCSCAN_API_KEY`)
- **Blockfrost** — Cardano API (`BLOCKFROST_API_KEY`)

---

## 3. Wallet & Authentication

| Dependency | Version | Purpose |
|------------|---------|---------|
| [`@coinbase/wallet-sdk`](https://docs.cdp.coinbase.com/wallet-sdk) | ^4.3.7 | Coinbase Wallet integration for browser-based wallet connections. |
| [`@metamask/sdk`](https://docs.metamask.io/wallet/sdk/) | ^0.34.0 | MetaMask wallet integration for dApp connections. |
| [`@simplewebauthn/browser`](https://simplewebauthn.com/) | ^13.3.0 | WebAuthn (passkeys) client-side implementation for passwordless authentication. |
| [`@simplewebauthn/server`](https://simplewebauthn.com/) | ^13.3.0 | WebAuthn server-side verification for authentication flows. |
| [`@solana/wallet-adapter-base`](https://github.com/solana-labs/wallet-adapter) | ^0.9.27 | Base utilities for Solana wallet adapter pattern. |
| [`@solana/wallet-adapter-react`](https://github.com/solana-labs/wallet-adapter) | ^0.15.39 | React hooks and context for Solana wallet connections. |
| [`@solana/wallet-adapter-react-ui`](https://github.com/solana-labs/wallet-adapter) | ^0.9.39 | Pre-built UI components for Solana wallet selection and connection. |
| [`@solana/wallet-adapter-wallets`](https://github.com/solana-labs/wallet-adapter) | ^0.19.37 | Bundle of supported Solana wallet adapters (Phantom, Solflare, etc.). |
| [`@solana/web3.js`](https://solana-labs.github.io/solana-web3.js/) | ^1.87.6 | Core Solana Web3 library for transaction building, signing, and RPC calls. |
| [`jsonwebtoken`](https://github.com/auth0/node-jsonwebtoken) | ^9.0.2 | JWT creation and verification for API authentication and session management. |
| [`bcryptjs`](https://github.com/dcodeIO/bcrypt.js) | ^3.0.3 | Password hashing for user accounts (bcrypt implementation in pure JS). |
| [`openpgp`](https://openpgpjs.org/) | ^6.3.0 | OpenPGP encryption/decryption for secure message handling and key management. |

**WalletConnect / Reown** (referenced in `next.config.mjs` transpilePackages):
- `@reown/appkit` — WalletConnect v2 / Reown AppKit for multi-wallet dApp connections.
- `@walletconnect/universal-provider` — WalletConnect protocol implementation.

---

## 4. Payment Processing

| Dependency | Version | Purpose |
|------------|---------|---------|
| [`stripe`](https://stripe.com/docs/stripe-js) | ^20.3.1 | Stripe SDK for card payments, Connect onboarding, and webhook handling. |
| [`axios`](https://axios-http.com/) | ^1.16.0 | HTTP client for making requests to external payment APIs (Tatum, Kraken, ChangeNOW, etc.). |
| [`qrcode`](https://github.com/soldair/node-qrcode) | ^1.5.3 | QR code generation for payment URIs (BIP21, EIP-681, Solana Pay). |
| [`papaparse`](https://www.papaparse.com/) | ^5.5.3 | CSV parsing for bulk operations (e.g., importing/exporting transaction data). |
| [`@types/papaparse`](https://github.com/mholt/PapaParse) | ^5.5.2 | TypeScript type definitions for PapaParse. |

**External Payment Services**:
- **Stripe** — Card payments and Connect (`STRIPE_SECRET_KEY`, `STRIPE_PUBLISHABLE_KEY`, `STRIPE_WEBHOOK_SECRET`)
- **Tatum API** — Exchange rates for BTC, ETH, SOL (`TATUM_API_KEY`)
- **Kraken API** — Fallback exchange rates, especially for Polygon (`KRAKEN_API_KEY`, `KRAKEN_API_SECRET`)
- **ChangeNOW** — Crypto swap/convert functionality (`CHANGENOW_API_KEY`)
- **SideShift** — Additional swap integration (`SIDESHIFT_AFFILIATE_ID`, `SIDESHIFT_SECRET`)

---

## 5. Database & Backend Services

| Dependency | Version | Purpose |
|------------|---------|---------|
| [`@supabase/supabase-js`](https://supabase.com/docs/reference/javascript) | ^2.39.0 | Supabase client for PostgreSQL database access, authentication, and real-time subscriptions. |
| [`supabase`](https://supabase.com/cli) | ^2.84.4 | Supabase CLI for local development, migrations, and database management. |

**Supabase Configuration** (from `.env.example`):
- `NEXT_PUBLIC_SUPABASE_URL` — Supabase project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` — Anonymous public key for client-side queries
- `SUPABASE_SERVICE_ROLE_KEY` — Admin key for server-side operations (bypasses RLS)
- `SUPABASE_PUBLISHABLE_KEY` / `SUPABASE_SECRET_KEY` — New API-keys style
- `SUPABASE_ACCESS_TOKEN` — For migrations and CLI
- `SUPABASE_DB_PASSWORD` — Database connection password
- `SUPABASE_JWT_SECRET` — JWT signing for Supabase auth

---

## 6. UI & Styling

| Dependency | Version | Purpose |
|------------|---------|---------|
| [`tailwindcss`](https://tailwindcss.com/) | ^3.4.1 | Utility-first CSS framework for rapid UI development. |
| [`postcss`](https://postcss.org/) | ^8.5.10 | CSS transformation tool used by Tailwind CSS. |
| [`autoprefixer`](https://github.com/postcss/autoprefixer) | ^10.4.17 | PostCSS plugin to add vendor prefixes to CSS. |
| [`@dayflow/core`](https://dayflow.dev/) | ^3.3.6 | Drag-and-drop calendar/scheduling library for booking and appointment features. |
| [`@dayflow/plugin-drag`](https://dayflow.dev/) | ^1.2.6 | Drag interaction plugin for Dayflow calendar components. |
| [`@dayflow/react`](https://dayflow.dev/) | ^3.3.6 | React bindings for Dayflow calendar components. |
| [`sanitize-html`](https://github.com/apostrophecms/sanitize-html) | ^2.17.4 | HTML sanitization to prevent XSS attacks in user-generated content. |
| [`@types/sanitize-html`](https://github.com/apostrophecms/sanitize-html) | ^2.16.1 | TypeScript definitions for sanitize-html. |

---

## 7. Testing & Quality Assurance

| Dependency | Version | Purpose |
|------------|---------|---------|
| [`vitest`](https://vitest.dev/) | ^4.1.0 | Fast unit test runner (replaces Jest) — 2,800+ tests in the project. |
| [`@vitest/ui`](https://vitest.dev/guide/ui) | ^1.2.1 | Visual UI for Vitest test runner. |
| [`@vitest/coverage-v8`](https://vitest.dev/guide/coverage) | ^1.2.1 | Code coverage reporting using V8's native coverage. |
| [`@testing-library/react`](https://testing-library.com/react) | ^14.1.2 | React component testing utilities (rendering, querying, events). |
| [`@testing-library/jest-dom`](https://github.com/testing-library/jest-dom) | ^6.2.0 | Custom Jest/Vitest matchers for DOM assertions. |
| [`@testing-library/user-event`](https://testing-library.com/user-event) | ^14.6.1 | Simulates user interactions (clicks, typing) in tests. |
| [`@playwright/test`](https://playwright.dev/) | ^1.60.0 | End-to-end browser testing framework. |
| [`jsdom`](https://github.com/jsdom/jsdom) | ^23.2.0 | DOM implementation for Node.js — enables testing React components in a browser-like environment. |
| [`eslint`](https://eslint.org/) | ^9.39.1 | JavaScript/TypeScript linter for code quality and style enforcement. |
| [`@eslint/eslintrc`](https://github.com/ES-ES/eslint-plugin-eslint-comments) | ^3.3.3 | ESLint configuration compatibility layer. |
| [`eslint-config-next`](https://nextjs.org/docs/app/building-your-application/configuring/eslint) | 16.1.0 | Next.js-specific ESLint rules and configuration. |
| [`prettier`](https://prettier.io/) | ^3.2.4 | Code formatter for consistent style across the codebase. |

---

## 8. Monitoring & Analytics

| Dependency | Version | Purpose |
|------------|---------|---------|
| [`posthog-js`](https://posthog.com/) | ^1.381.0 | Product analytics and feature flagging — tracks user behavior and feature usage. |
| [`@opentelemetry/exporter-logs-otlp-http`](https://opentelemetry.io/) | ^0.218.0 | OpenTelemetry log exporter for distributed tracing and observability. |
| [`@opentelemetry/resources`](https://opentelemetry.io/) | ^2.7.1 | OpenTelemetry resource detection for service identification. |
| [`@opentelemetry/sdk-logs`](https://opentelemetry.io/) | ^0.218.0 | OpenTelemetry SDK for log collection and processing. |

**Monitoring Configuration**:
- `ENABLE_BACKGROUND_MONITOR` — Enables background payment monitoring loop
- `CRAWLPROOF_PROJECT_ID` / `CRAWLPROOF_PROJECT_KEY` — CrawlProof audience analytics

---

## 9. Email & Communication

| Dependency | Version | Purpose |
|------------|---------|---------|
| [`@profullstack/emailer`](https://github.com/profullstack/emailer) | ^1.0.1 | Email sending utility for transactional emails (password resets, notifications, invoices). |

**Email Service Providers** (from `.env.example`):
- **Mailgun** — `MAILGUN_API_KEY`, `MAILGUN_DOMAIN`
- **Resend** — `RESEND_API_KEY` (modern email API alternative)

---

## 10. Build, Dev & CLI Tools

| Dependency | Version | Purpose |
|------------|---------|---------|
| [`@opennextjs/cloudflare`](https://opennext.js.org/) | ^1.0.0 | Adapter for deploying Next.js to Cloudflare Pages/Workers. |
| [`tsx`](https://github.com/privatenumber/tsx) | ^4.21.0 | TypeScript execution engine for running `.ts`/`.mts` scripts directly (used in scripts/). |
| [`chalk`](https://github.com/chalk/chalk) | ^5.6.2 | Terminal string styling for CLI output (used in scripts). |
| [`inquirer`](https://github.com/SBoudrias/Inquirer.js) | ^13.0.1 | Interactive command-line prompts for CLI tools. |
| [`ignore-loader`](https://github.com/cherrry/ignore-loader) | ^0.1.2 | Webpack loader to ignore specific imports (used for optional dependencies). |
| [`@vitejs/plugin-react`](https://github.com/vitejs/vite-plugin-react) | ^4.2.1 | Vite plugin for React — used for Vitest test runner. |
| [`@profullstack/autoblog`](https://github.com/profullstack/autoblog) | github:profullstack/autoblog#75e54af | Automated blog content generation from prompts. |
| [`@profullstack/referrals`](https://github.com/profullstack/referrals) | ^0.1.0 | Referral tracking system for partner commissions. |

---

## 11. SDK & Internal Packages

| Package | Location | Purpose |
|---------|----------|---------|
| `@profullstack/tempesttouch` | `packages/sdk/` | Official Node.js SDK and CLI for programmatic access to Tempest Touch APIs. |
| `tempesttouch` (CLI) | `bin/tempesttouch` | Command-line interface for payments, escrows, wallets, and x402 operations. |

---

## 12. External Services & APIs (Infrastructure)

| Service | Environment Variables | Purpose |
|---------|----------------------|---------|
| **Supabase** | `NEXT_PUBLIC_SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, etc. | Primary database (PostgreSQL), authentication, and real-time features. |
| **Alchemy** | `ALCHEMY_API_KEY`, `ETHEREUM_RPC_URL`, `POLYGON_RPC_URL`, etc. | Ethereum and Polygon RPC provider for blockchain interactions. |
| **Tatum** | `TATUM_API_KEY` | Exchange rate API for BTC, ETH, SOL price feeds. |
| **Kraken** | `KRAKEN_API_KEY`, `KRAKEN_API_SECRET` | Fallback exchange rates (especially for Polygon). |
| **Stripe** | `STRIPE_SECRET_KEY`, `STRIPE_PUBLISHABLE_KEY`, `STRIPE_WEBHOOK_SECRET` | Card payments, Connect onboarding, and payouts. |
| **Mailgun / Resend** | `MAILGUN_API_KEY`, `RESEND_API_KEY` | Transactional email delivery. |
| **Greenlight (Blockstream)** | `GL_NOBODY_CRT`, `GL_NOBODY_KEY`, `GL_NETWORK` | Hosted Lightning Network node (CLN) for BOLT12 payments. |
| **LNbits** | `LNBITS_URL`, `LNBITS_ADMIN_KEY`, `LNBITS_INVOICE_KEY` | Lightning Network account management (alternative to Greenlight). |
| **ChangeNOW** | `CHANGENOW_API_KEY` | Crypto swap/convert service. |
| **SideShift** | `SIDESHIFT_AFFILIATE_ID`, `SIDESHIFT_SECRET` | Additional crypto swap integration. |
| **CrawlProof** | `CRAWLPROOF_PROJECT_ID`, `CRAWLPROOF_PROJECT_KEY` | Audience analytics and attribution. |
| **WalletConnect / Reown** | `NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID` | Multi-wallet dApp connection protocol. |
| **Etherscan / Polygonscan / BSCScan** | `ETHERSCAN_API_KEY`, `POLYGONSCAN_API_KEY`, `BSCSCAN_API_KEY` | Transaction indexing and verification. |
| **Blockfrost** | `BLOCKFROST_API_KEY` | Cardano blockchain API. |
| **Crypto APIs** | `CRYPTO_APIS_KEY` | Multi-chain block explorer for BCH and others. |

---

## 13. Security & Encryption

| Dependency | Purpose |
|------------|---------|
| `ENCRYPTION_KEY` | AES-256 encryption key for encrypting sensitive data at rest (private keys, API credentials). |
| `MASTER_ENCRYPTION_KEY` | Master key for advanced encryption features. |
| `LN_KEY_ENCRYPTION_KEY` | Dedicated encryption key for Lightning Network private keys. |
| `JWT_SECRET` | Secret for signing and verifying JWT tokens (authentication). |
| `OIDC_SIGNING_SECRET` | OpenID Connect signing secret for OAuth flows. |
| `REPUTATION_SIGNING_SECRET` | Secret for signing DID reputation credentials. |
| `WEBHOOK_SECRET` / `WEBHOOK_SIGNING_SECRET` | Secrets for verifying webhook payload signatures. |
| `INTERNAL_API_KEY` | API key for internal service-to-service communication. |
| `CRON_SECRET` | Secret for securing cron job endpoints. |

---

## 14. Deployment & Infrastructure

| Component | Purpose |
|-----------|---------|
| **Docker** | Containerized deployment using multi-stage builds (Node 20 Alpine). |
| **Docker Compose** | Orchestrates the app container with port 8080 exposed. |
| **Coolify** | Self-hosted PaaS for one-click deployments (recommended in README). |
| **Cloudflare Pages** | Alternative deployment target via `@opennextjs/cloudflare`. |
| **GitHub Actions** | CI/CD for automated builds and tests (referenced in README). |

---

## 15. Critical Path Summary

### Must-Have for Production
1. **Node.js >= 20.9.0** + **pnpm** — Runtime and package manager
2. **Supabase** — Database, auth, and real-time backend
3. **RPC Providers** (Alchemy/Infura + Bitcoin node) — Blockchain connectivity
4. **Encryption Keys** (`ENCRYPTION_KEY`, `JWT_SECRET`) — Security
5. **System Mnemonics** (`SYSTEM_MNEMONIC_BTC`, `ETH`, `POL`, `SOL`) — HD wallet seed phrases for payment address generation
6. **Platform Fee Wallets** — Addresses where 0.5% commission is sent
7. **Email Service** (Mailgun or Resend) — Transactional emails
8. **Stripe** (optional but recommended) — Card payments

### Must-Have for Development
1. **Node.js >= 20.9.0** + **pnpm**
2. **Supabase** (local or cloud)
3. **RPC endpoints** (can use public/testnet for development)
4. **Test mnemonic phrases** (generated via `scripts/gen-mnemonic.mjs`)

### Optional but Recommended
1. **Greenlight** — Managed Lightning nodes for BOLT12
2. **LNbits** — Alternative Lightning account management
3. **Tatum API** — Reliable exchange rates
4. **PostHog** — Product analytics
5. **OpenTelemetry** — Distributed tracing
6. **WalletConnect** — Enhanced wallet connectivity
7. **ChangeNOW / SideShift** — Crypto swap features

---

## 16. Dependency Tree Insights

### Heavy Dependencies (Bundle Size Impact)
- `@emurgo/cardano-serialization-lib-nodejs` — Large WASM-based library for Cardano
- `@solana/web3.js` — Full Solana client library
- `ethers` + `viem` — Dual Ethereum libraries (some overlap, both used for different features)
- `@noble/curves` + `@noble/ed25519` + `@noble/hashes` — Cryptographic primitives
- `openpgp` — Full OpenPGP implementation

### Transpilation Requirements (from `next.config.mjs`)
The following packages require transpilation due to ESM/CJS compatibility issues:
- `@reown/appkit` and related adapters
- `@walletconnect/*` packages
- `@solana/wallet-adapter-*` packages
- `@noble/hashes`, `@noble/curves`
- `openpgp`

### Security Considerations
- All private keys and mnemonics are encrypted at rest using AES-256
- Webhook signatures are verified using HMAC
- JWT tokens are used for API authentication
- Row-Level Security (RLS) is enforced on all Supabase tables
- CSP headers are configured in `next.config.mjs` to prevent XSS

---

*This analysis covers all dependencies as of package.json version 0.6.11.*
