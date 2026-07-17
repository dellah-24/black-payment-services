# Plan: Remove ProFullStack & Leave a Clean Skeleton

**Goal:** Strip every ProFullStack (`@profullstack/*`, `profullstack.com`, `feedback.profullstack.com`, `datafa.st`, `crawlproof.com`) dependency from the project, keep the Next.js app skeleton + local crypto/wallet/escrow logic, and document the functional gaps with alternative suggestions.

**Key finding:** The app does **not** import `@profullstack/tempesttouch` at runtime. [`src/lib/sdk/index.ts`](src/lib/sdk/index.ts:1) is a **self-contained local stub** (own `TempestTouchClient`, HMAC webhook verification, etc.). The *real* SDK source lives in the `packages/sdk` monorepo package (published as `@profullstack/tempesttouch`). So the "new flesh" already exists locally — we keep the stub as the skeleton's payment lib and remove the ProFullStack product packages + peripheral services.

---

## 1. Inventory of ProFullStack touchpoints

### 1a. Root npm dependencies (`package.json`)
| Package | Used in |
|---|---|
| `@profullstack/autoblog` (line 50) | [`src/app/sitemap.ts`](src/app/sitemap.ts:2), [`src/app/blog/rss.xml/route.ts`](src/app/blog/rss.xml/route.ts:2), [`src/app/api/webhooks/crawlproof/route.ts`](src/app/api/webhooks/crawlproof/route.ts:1) |
| `@profullstack/emailer` (line 51) | [`src/app/api/admin/email-broadcast/route.ts`](src/app/api/admin/email-broadcast/route.ts:4) |
| `@profullstack/referrals` (line 52) | [`src/lib/referrals.ts`](src/lib/referrals.ts:1), [`src/app/api/referrals/route.ts`](src/app/api/referrals/route.ts:2), [`src/app/layout.tsx`](src/app/layout.tsx:2) (`ReferralProvider`), [`middleware.ts`](middleware.ts:10) (referral cookie tracking) |

> Note: `@profullstack/tempesttouch` is **not** a root dependency — only the local stub is used.

### 1b. SaaS scripts / CSP domains
- `feedback.profullstack.com` — feedback widget ([`src/app/layout.tsx`](src/app/layout.tsx:144), CSP in [`next.config.mjs`](next.config.mjs:46))
- `datafa.st` — DataFast analytics ([`src/app/layout.tsx`](src/app/layout.tsx:121), CSP)
- `crawlproof.com` — autoblog crawler (CSP, [`lib/crawlproof/server.ts`](lib/crawlproof/server.ts:1))
- `invitejs.trustpilot.com` — Trustpilot reviews ([`src/app/layout.tsx`](src/app/layout.tsx:124), CSP) — *not* ProFullStack, but a third-party widget; flag separately.

### 1c. Monorepo product packages (`pnpm-workspace.yaml` → `packages/*`)
- `packages/sdk` — the `@profullstack/tempesttouch` SDK source (the real engine)
- `packages/extension` — browser extension depending on `@profullstack/tempesttouch`
- `packages/tempesttouch-php` — PHP client for the merchant API

### 1d. Build/release scripts referencing ProFullStack
- [`scripts/fix-stub-packages.mjs`](scripts/fix-stub-packages.mjs:6) — restores `@profullstack/autoblog` + `@profullstack/tempesttouch` stubs from `packages/sdk`
- [`scripts/version-bump.js`](scripts/version-bump.js:182) — publishes `@profullstack/tempesttouch` to npm
- [`scripts/rebrand-*.mjs`](scripts/rebrand-tempest.mjs:1) — historical rebrand scripts (reference `@profullstack/coinpay` → `@profullstack/tempesttouch`)

### 1e. Branding / content references
- Footer, About, Contact, docs pages: `profullstack.com`, `github.com/profullstack/tempesttouch`
- [`src/lib/sdk/index.ts`](src/lib/sdk/index.ts:8) comments reference `@profullstack/tempesttouch`
- `bin/tempesttouch-reputation-claim`, `scripts/send-announcement.ts` (reply_to `anthony@profullstack.com`)

---

## 2. Removal steps (execution order)

1. **Root deps** — remove `@profullstack/autoblog`, `@profullstack/emailer`, `@profullstack/referrals` from [`package.json`](package.json:50); run `pnpm install`.
2. **Autoblog** — delete [`src/app/api/webhooks/crawlproof/route.ts`](src/app/api/webhooks/crawlproof/route.ts:1), [`lib/crawlproof/server.ts`](lib/crawlproof/server.ts:1); replace `buildSitemapBlogEntries`/`buildRssXml` usage in [`src/app/sitemap.ts`](src/app/sitemap.ts:2) + [`src/app/blog/rss.xml/route.ts`](src/app/blog/rss.xml/route.ts:2) with a local sitemap/RSS builder (or remove blog entries).
3. **Emailer** — delete/neutralize [`src/app/api/admin/email-broadcast/route.ts`](src/app/api/admin/email-broadcast/route.ts:1) (replace with a stub or remove the admin broadcast feature).
4. **Referrals** — delete [`src/lib/referrals.ts`](src/lib/referrals.ts:1) + [`src/app/api/referrals/route.ts`](src/app/api/referrals/route.ts:2); remove `ReferralProvider` from [`src/app/layout.tsx`](src/app/layout.tsx:2); strip referral cookie logic from [`middleware.ts`](middleware.ts:10) (keep CORS/rate-limit/security).
5. **SaaS scripts** — remove the `datafa.st`, `feedback.profullstack.com`, and `crawlproof.com` `<Script>`/`<script>` tags from [`src/app/layout.tsx`](src/app/layout.tsx:121); remove those domains from the CSP in [`next.config.mjs`](next.config.mjs:46) (keep `trustpilot` only if desired).
6. **Monorepo packages** — delete `packages/sdk`, `packages/extension`, `packages/tempesttouch-php`; update [`pnpm-workspace.yaml`](pnpm-workspace.yaml:1) (remove `packages/*` or scope to remaining packages).
7. **Build scripts** — delete/neutralize [`scripts/fix-stub-packages.mjs`](scripts/fix-stub-packages.mjs:6) + the `@profullstack/tempesttouch` publish step in [`scripts/version-bump.js`](scripts/version-bump.js:182); remove `postinstall` stub-fix from [`package.json`](package.json:25).
8. **Rebrand the local stub** — rename `TempestTouchClient`/comments in [`src/lib/sdk/index.ts`](src/lib/sdk/index.ts:1) away from ProFullStack; this becomes the skeleton's payment lib ("new flesh").
9. **Branding sweep** — replace `profullstack.com` / `github.com/profullstack/tempesttouch` references in Footer/About/Contact/docs with the new brand (decision needed — see §4).
10. **Verify** — `pnpm type-check`, `pnpm lint`, `pnpm build`, `pnpm test`.

---

## 3. What stays (the "new flesh" — already local, no ProFullStack)
- **Crypto primitives**: `@noble/*`, `bitcoinjs-lib`, `ethers`, `viem`, `@solana/web3.js`, `@scure/bip32/bip39`, `tiny-secp256k1`, `tweetnacl`, `openpgp` (all in [`package.json`](package.json:44)).
- **Wallets**: [`src/lib/wallets/*`](src/lib/wallets/system-wallet.ts:1) (system-wallet, secure-forwarding, keyStorage) — local.
- **Escrow**: [`src/lib/escrow/service.ts`](src/lib/escrow/service.ts:1) — local logic.
- **Webhook verification**: HMAC-SHA256 in [`src/lib/sdk/index.ts`](src/lib/sdk/index.ts:316) — local, keep.
- **Analytics alt**: `posthog-js` already a dependency ([`package.json`](package.json:79)) — can replace DataFast.
- **Payments infra**: `stripe` already present ([`package.json`](package.json:84)) for card payments.

---

## 4. Gap analysis & alternative suggestions

| # | Removed capability | Impact | Suggested alternative(s) |
|---|---|---|---|
| G1 | **Real crypto payment processing** (address gen, tx monitoring, confirmations) — was `packages/sdk` | High. `src/lib/sdk/index.ts` is a **stub returning fake data**; no live payments. | BTCPay Server (self-hosted, non-custodial); Coinbase Commerce; OpenNode; **or** build on local libs (`bitcoinjs-lib`+indexer, `ethers`/`viem`+RPC, `@solana/web3.js`+RPC, Lightning `ln-service`/`lnd`). |
| G2 | **Referrals / affiliate** (`@profullstack/referrals`) | Medium. Attribution + codes gone. | Build own on Supabase (table + the cookie logic already inlined in `middleware.ts`); or Rewardful / FirstPromoter / SaaSquatch. |
| G3 | **Autoblog / SEO content** (`@profullstack/autoblog` + Crawlproof) | Medium. Sitemap blog entries + RSS gone. | MDX/Contentlayer blog; headless CMS (Sanity, Contentful); or static MDX with `next-mdx-remote`. |
| G4 | **Email (transactional + broadcast)** (`@profullstack/emailer`) | Medium. Admin broadcast + emails broken. | Resend, Postmark, SendGrid, AWS SES, or `nodemailer`+SMTP. |
| G5 | **Analytics** (`datafa.st`) | Low. `posthog-js` already present. | PostHog (already a dep), Plausible, Umami, Fathom. |
| G6 | **Feedback widget** (`feedback.profullstack.com`) | Low. | Typeform, Canny, Formspree, or custom form → Supabase. |
| G7 | **Reputation / DID** (`@profullstack/tempesttouch/reputation`) | Medium. Trust profiles, action receipts. | Build own; or `did-jwt` / `ion` DID libs; or drop the feature. |
| G8 | **Published SDK + browser extension + PHP client** (`packages/*`) | High (product surface). | Re-establish as first-party packages under the new brand, or drop the extension/PHP distribution. |
| G9 | **Trustpilot reviews widget** (`invitejs.trustpilot.com`) | Low. *Not* ProFullStack. | Keep, or replace with EmbedSocial/static reviews. |

---

## 5. Decisions needed from you (blockers before full execution)
1. **New brand name** for replacing "TempestTouch" / "ProFullStack" across UI, docs, packages, and the SDK stub class.
2. **G1 payment engine**: adopt a turnkey processor (BTCPay/Coinbase Commerce/OpenNode) vs. build a self-hosted engine on the existing crypto libs? This is the largest gap and dictates the skeleton's payment module shape.
3. **Scope of `packages/*`**: delete entirely, or re-home as first-party packages under the new brand?
4. **Trustpilot widget**: keep or remove (it's not ProFullStack)?

---

## 6. Execution note
This plan is the architect deliverable. Actual file deletion/rewrites require **Code mode** (architect mode is restricted to `.md`). After approval, switch to Code mode to execute steps 1–10, then re-run type-check/lint/build/test.
