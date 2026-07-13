# Rebrand Plan: Tempest Touch → "Tempest Touch" (tempesttouch.com)

**Goal:** Rebrand the entire platform from Tempest Touch / Tempest Touch / tempesttouch.com to
**Tempest Touch** / **tempesttouch.com** across UI, docs, emails, code identifiers, and
technical contracts.

**Status:** Plan (Architect mode). Not yet executed. Execution happens in Code mode after approval.

---

## 0. Critical context (read first)

A literal "rename everything" is **destructive**. The brand string is not just a label — it is
woven into live integration contracts:

- `x-tempesttouch-signature` webhook header — merchants verify payments with this.
- `TEMPESTTOUCH_API_KEY` / `TEMPESTTOUCH_WEBHOOK_SECRET` — the published SDK's public env-var API.
- `cp_live_`, `whsec_`, `biz_` API-key prefixes — embedded in every issued credential.
- `tempesttouch_wallet` / `tempesttouch_wallets` localStorage keys — existing users' wallets.
- `did:tempesttouch:` — already-issued decentralized identifiers.
- `@profullstack/tempesttouch` — the npm package scope (published, not ours to rename freely).

Renaming these without a transition **breaks every live merchant, every stored wallet, and
every issued DID**. The plan below uses a **dual-support window** so the rebrand ships without
an instant outage, then old identifiers are deprecated later.

**The Cloudflare Pages build we just fixed MUST stay green** throughout. Every phase ends with
a build check.

---

## 1. Brand mapping

| Old | New | Notes |
|-----|-----|-------|
| `Tempest Touch` (display) | `Tempest Touch` | UI wordmark, headings, titles |
| `Tempest Touch` | `Tempest Touch` | Docs/product name |
| `tempesttouch.com` | `tempesttouch.com` | Live domain (DNS) |
| `Tempest Touch` (WebAuthn RP name) | `Tempest Touch` | `getRpName()` |
| `tempesttouch.com` (WebAuthn RP ID / default URLs) | `tempesttouch.com` | `getRpId()`, `NEXT_PUBLIC_APP_URL` default |
| `x-tempesttouch-signature` | `x-tempesttouch-signature` | Webhook header — **dual-send during transition** |
| `X-Tempest Touch-Signature` (sent) | `X-TempestTouch-Signature` | Server outbound — send both |
| `tempesttouch_wallet` / `tempesttouch_wallets` / `tempesttouch_active_wallet` | `tempesttouch_wallet` / `tempesttouch_wallets` / `tempesttouch_active_wallet` | localStorage — **migrate on load** |
| `did:tempesttouch:` | `did:tempesttouch:` | **Dual-resolve** old + new |
| `TEMPESTTOUCH_*` env vars | `TEMPESTTOUCH_*` | **Read new, fall back to old** |
| `tempesttouch` CLI command | `tempesttouch` | Update `bin` + scripts |
| `tempesttouch-wallet` CLI | `tempesttouch-wallet` | Update `bin` + scripts |
| `@tempesttouch/wallet-sdk` | `@tempesttouch/wallet-sdk` | Internal package — rename + update imports |
| `@profullstack/tempesttouch` (external SDK) | **KEEP** (or publish `@tempesttouch/tempesttouch` alias) | Decision in §6 |
| `cp_live_` / `cpc_` / `cps_` / `whsec_` / `biz_` key prefixes | **KEEP** (recommend) | Changing invalidates all issued keys |
| `tempesttouch` (Supabase `project_id`, `sender_name`) | `tempesttouch` | External — rename in Supabase dashboard |
| `Tempest Touch` in email templates | `Tempest Touch` | `supabase/templates/*.html` |

---

## 2. Risk tiers

- **Tier A — Safe, direct rename** (no external contract): UI text, page `<title>`, email copy,
  marketing/docs prose, logo `alt`, `getRpName()`, display strings.
- **Tier B — Dual-support required** (keep old working during window): webhook header,
  `TEMPESTTOUCH_*` env vars, localStorage keys, `did:tempesttouch:` resolution, domain (old → new redirect).
- **Tier C — External / breaking — decide before touching**: API-key prefixes (recommend KEEP),
  npm package scope `@profullstack/tempesttouch` (recommend KEEP or alias), Supabase `project_id`
  (rename in dashboard), DNS for `tempesttouch.com`.

---

## 3. Execution phases

### Phase 0 — Prerequisites (external, block execution until done)
- [ ] Register `tempesttouch.com`; point DNS at the same Cloudflare deployment.
- [ ] Keep `tempesttouch.com` live and add a 301 redirect to `tempesttouch.com` (or run both).
- [ ] (Optional) Rename Supabase project `tempesttouch` → `tempesttouch` in dashboard.
- [ ] Decide §6 package-scope and key-prefix policy.

### Phase 1 — Tier A: visible brand (safe)
- [ ] `src/app/layout.tsx` + all page headings/titles: `Tempest Touch` → `Tempest Touch`.
- [ ] `supabase/templates/*.html`: titles, wordmark, body copy, `tempesttouch.com` links.
- [ ] `src/lib/webauthn/config.ts`: `getRpName()` → `'Tempest Touch'`.
- [ ] Docs (`docs/**`, `src/app/docs/**`): prose `Tempest Touch`/`Tempest Touch` → `Tempest Touch`.
- [ ] Logo `alt` text and any `Tempest Touch` SVG/wordmark assets.
- [ ] **Build check:** `pnpm run build:pages` stays green.

### Phase 2 — Tier B: dual-support identifiers (backward compatible)
- [ ] **Webhook header:** server (`src/lib/webhooks/service.ts`) sends BOTH
      `X-Tempest Touch-Signature` and `X-TempestTouch-Signature`. SDK (`packages/sdk/src/webhooks.js`)
      verifies EITHER. Docs show both.
- [ ] **Env vars:** add `TEMPESTTOUCH_*` reads that fall back to `TEMPESTTOUCH_*` in
      `src/lib/secrets/index.ts`, SDK `bin/tempesttouch.js`, and all config loaders. Keep `TEMPESTTOUCH_*`
      working.
- [ ] **localStorage:** `src/lib/web-wallet/*` read old `tempesttouch_wallet(s)`/`tempesttouch_active_wallet`
      and migrate to `tempesttouch_*` on first load; keep reading old during window.
- [ ] **DID:** resolver accepts both `did:tempesttouch:` and `did:tempesttouch:`; new DIDs issued with
      the new method.
- [ ] **Build check:** green.

### Phase 3 — Domain + URLs
- [ ] Replace default URLs `https://tempesttouch.com` → `https://tempesttouch.com` in
      `src/lib/webauthn/config.ts`, `NEXT_PUBLIC_APP_URL` defaults, `scripts/ensure-platform-stripe-webhook.ts`,
      SDK `bin/tempesttouch.js` default base URL, and all docs/examples.
- [ ] Keep `tempesttouch.com` accepted (redirect) during transition.
- [ ] **Build check:** green.

### Phase 4 — CLI + scripts
- [ ] Rename `tempesttouch` → `tempesttouch` and `tempesttouch-wallet` → `tempesttouch-wallet` in
      `packages/sdk/bin/tempesttouch.js`, `scripts/tempesttouch-wallet.mjs`, `package.json` `bin`, and any
      references in docs/scripts.
- [ ] Update `scripts/version-bump.js` patterns (`TEMPESTTOUCH_WC_VERSION` → `TEMPESTTOUCH_WC_VERSION`,
      `TEMPESTTOUCH_PLUGIN_VERSION` → `TEMPESTTOUCH_PLUGIN_VERSION`) and plugin PHP constants.
- [ ] **Build check:** green.

### Phase 5 — Internal package rename
- [ ] `@tempesttouch/wallet-sdk` → `@tempesttouch/wallet-sdk`: update `packages/sdk/package.json`
      (or the wallet-sdk package) `name`, and all imports across `src/**` and docs.
- [ ] **Build check:** green.

### Phase 6 — Verify & deploy
- [ ] Full `pnpm run build:pages` passes; `Validating asset output directory` OK; Function publishes
      (Workers Paid active).
- [ ] Push to `main`; confirm Cloudflare Pages deploy succeeds.
- [ ] Smoke-test: login, create payment, webhook verify (old + new header), wallet load (old key
      migrates), DID resolve (old + new).

### Phase 7 — Deprecate (after transition window, e.g. 60–90 days)
- [ ] Remove `X-Tempest Touch-Signature` send, `TEMPESTTOUCH_*` fallback, old localStorage read,
      `did:tempesttouch:` resolve, and `tempesttouch.com` redirect.
- [ ] Bump SDK major version; publish migration guide to merchants.

---

## 4. Explicitly OUT of scope (recommend KEEP)
- API-key prefixes (`cp_live_`, `whsec_`, `biz_`, `cpc_`, `cps_`) — changing breaks all issued keys.
- `@profullstack/tempesttouch` npm scope — external; keep or publish a new alias package instead.
- Live merchant `.env` files — they keep `TEMPESTTOUCH_*` working via the Phase 2 fallback.

---

## 5. Open decisions for you
1. **API-key prefixes:** keep `cp_live_` etc. (recommended) or invalidate all keys?
2. **npm scope:** keep `@profullstack/tempesttouch` (recommended) or publish `@tempesttouch/tempesttouch`?
3. **Supabase project_id:** rename in dashboard now, or leave `tempesttouch`?
4. **Transition window length** before Phase 7 deprecation (recommend 60–90 days).

---

## 6. Mermaid — transition flow

```mermaid
flowchart TD
  A[Phase 0 DNS + Supabase + decisions] --> B[Phase 1 Visible brand UI emails docs]
  B --> C[Phase 2 Dual-support env header storage DID]
  C --> D[Phase 3 Domain URLs]
  D --> E[Phase 4 CLI scripts]
  E --> F[Phase 5 Internal package rename]
  F --> G[Phase 6 Build green + deploy + smoke test]
  G --> H[Phase 7 Deprecate old identifiers]
  C -. old TEMPESTTOUCH_ and x-tempesttouch-signature still work .-> Merchants
  C -. old tempesttouch_wallet key migrates .-> Existing users
```
