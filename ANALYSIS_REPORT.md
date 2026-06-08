# BlackPayments Wallet - Codebase Analysis

**Date:** 2026-06-06  
**Project:** BlackPayments Wallet (blackpayments-web)  
**Stack:** Next.js 14, TypeScript 5.3, ethers.js v6, Supabase, React 18

---

## 1. High-Level Architecture

```
src/
├── app/                    # Next.js App Router pages
│   ├── page.tsx           # Dashboard (main entry)
│   ├── auth/page.tsx      # Authentication
│   ├── send/page.tsx      # Send USDT
│   ├── history/page.tsx   # Transaction history
│   ├── p2p/page.tsx       # P2P trading
│   ├── profile/page.tsx   # User profile
│   └── settings/page.tsx  # Settings
├── wallet/                # Core wallet SDK
│   ├── BlackPaymentsWallet.ts   # Main EVM wallet class
│   ├── BlackPaymentsSmartWallet.ts  # ERC-4337 account abstraction
│   ├── HotWallet.ts             # Hot wallet (daily ops)
│   ├── ColdWallet.ts            # Cold wallet (reserve)
│   ├── SplitCustodyManager.ts   # Hot/Cold coordinator
│   ├── factory.ts               # Wallet creation helpers
│   ├── chains.ts                # Chain configs + USDT tokens
│   ├── types.ts                 # Type definitions
│   ├── crypto.ts                # Encryption utilities
│   ├── signer.ts                # Signer adapters
│   └── providers/               # Multi-chain provider system
│       ├── BaseProvider.ts
│       ├── ProviderRegistry.ts
│       ├── EthereumProvider.ts
│       ├── SolanaProvider.ts
│       ├── BitcoinProvider.ts
│       ├── TONProvider.ts
│       ├── AptosProvider.ts
│       └── adapter/
├── lib/                   # Utilities
│   ├── logger.ts
│   ├── secureWalletStorage.ts
│   ├── rateLimiter.ts
│   ├── rpcProvider.ts
│   └── ...
├── hooks/                 # React hooks
│   ├── useWallet.ts
│   ├── useWalletAuth.ts
│   └── useWalletBalance.ts
├── stores/                # Zustand state
│   └── walletStore.ts
├── p2p/                   # P2P trading engine
├── defi/                  # DeFi integrations
├── swap/                  # Token swap
├── kyc/                   # KYC verification
├── browser/               # DApp browser
└── index.ts               # Main SDK exports
```

---

## 2. Core Wallet System Analysis

### 2.1 `BlackPaymentsWallet` (Primary Wallet Class)

**Location:** `src/wallet/BlackPaymentsWallet.ts`  
**Purpose:** Main EVM-compatible USDT wallet

**Strengths:**
- Clean separation of concerns (wallets, providers, addresses as Maps)
- Gas buffer multiplier (130%) prevents out-of-gas errors
- Rate limiting on `sendUSDT`
- Comprehensive MoonPay integration
- Proper disposal method for memory cleanup

**Critical Issues:**

| Issue | Severity | Description |
|-------|----------|-------------|
| **EVM-only** | High | Despite `WalletChain` enum listing 15 chains, `BlackPaymentsWallet` only works with EVM chains. Non-EVM chains (TRON, Solana, Bitcoin, Cosmos, TON, Aptos) are not supported by this class. |
| **Hardcoded 18 decimals** | Medium | `formatNativeBalance()` always uses 18 decimals, but BSC uses 18, Polygon uses 18, while some chains differ. Should use chain-specific decimals from `CHAIN_CONFIGS`. |
| **Empty RPC fallback** | Medium | `getGetBlockRpcUrl()` returns `''` when no API key is set, which will cause `JsonRpcProvider` to fail silently or throw confusing errors. |
| **No error recovery** | Medium | `getBalance()` and `sendUSDT()` don't implement retry logic for transient RPC failures. |

### 2.2 `WalletChain` Enum Mismatch

**Location:** `src/wallet/types.ts:8-24`

```typescript
export enum WalletChain {
  ETHEREUM = 'ethereum',
  POLYGON = 'polygon',
  BSC = 'bsc',
  ARBITRUM = 'arbitrum',
  OPTIMISM = 'optimism',
  AVALANCHE = 'avalanche',
  CELO = 'celo',
  LINEA = 'linea',
  BASE = 'base',
  TRON = 'tron',        // Non-EVM
  SOLANA = 'solana',    // Non-EVM
  BITCOIN = 'bitcoin',  // Non-EVM
  COSMOS = 'cosmos',    // Non-EVM
  TON = 'ton',          // Non-EVM
  APTOS = 'aptos',      // Non-EVM
}
```

**Problem:** The enum mixes EVM and non-EVM chains, but the core wallet only supports EVM. This creates a misleading API where users might try to use `WalletChain.SOLANA` with `BlackPaymentsWallet` and get runtime errors.

### 2.3 USDT Token Configs for Non-EVM Chains

**Location:** `src/wallet/chains.ts:62-168`

Non-EVM chains have empty `tokenAddress`:
- `WalletChain.TRON`: `tokenAddress: 'TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t'` (TRC-20, but `BlackPaymentsWallet` uses EVM ABI)
- `WalletChain.SOLANA`: `tokenAddress: 'Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB'` (SPL token)
- `WalletChain.BITCOIN`: `tokenAddress: ''` (Omni layer)
- Others: empty addresses

**Problem:** The `USDT_TOKENS` config suggests multi-chain USDT support, but the actual implementation only handles EVM ERC-20 tokens.

---

## 3. Provider System Analysis

### 3.1 `ProviderRegistry` Pattern

**Location:** `src/wallet/providers/ProviderRegistry.ts`

This is a well-designed multi-chain provider system inspired by Trust Wallet:
- Abstract `BaseProvider` with `request()` method
- Chain-specific providers (`EthereumProvider`, `SolanaProvider`, etc.)
- Adapter pattern for Promise/Callback styles
- Event emission for account/chain changes

**Critical Issue: Not Integrated with Core Wallet**

The `ProviderRegistry` and `BaseProvider` system exists as a separate, well-architected module, but:
- `BlackPaymentsWallet` does NOT use `ProviderRegistry`
- `BlackPaymentsWallet` uses `ethers.JsonRpcProvider` directly
- The provider system is exported in `src/index.ts` but appears unused by the main wallet

This suggests either:
1. The provider system is for future integration
2. It was built for a different purpose (e.g., DApp browser)
3. It's dead code that should be removed or connected

### 3.2 `EthereumProvider` RPC Implementation

**Location:** `src/wallet/providers/EthereumProvider.ts:62-84`

Uses `fetch()` for JSON-RPC calls. This is fine for browser environments but:
- No timeout configuration
- No retry logic
- No connection pooling
- `Date.now() + Math.random()` for JSON-RPC ID is not ideal (could collide)

---

## 4. Security Analysis

### 4.1 Split Custody System

**Files:** `HotWallet.ts`, `ColdWallet.ts`, `SplitCustodyManager.ts`

**Strengths:**
- Industry-standard hot/cold wallet separation (5-20% hot, 80-95% cold)
- Whitelist protection for withdrawals
- Multi-sig support for cold wallet
- Cooldown periods between withdrawals
- Audit trail for all transactions
- Daily volume limits

**Issues:**

| Issue | Severity | Location |
|-------|----------|----------|
| **Missing `logger` import** | High | `ColdWallet.ts:114` uses `logger.warn()` but `logger` is never imported |
| **Optional DB dependency** | Medium | `HotWallet.ts:22-28` tries to `require('./jobs/db')` which doesn't exist in the file tree |
| **In-memory state** | Medium | `SplitCustodyManager` stores pending transfers in memory - lost on restart |
| **No actual multi-sig verification** | Medium | `addSignature()` just pushes strings without cryptographic verification |

### 4.2 Secure Storage

**Location:** `src/lib/secureWalletStorage.ts`

The `useWallet` hook (`src/hooks/useWallet.ts`) stores private keys and mnemonics in Supabase:
```typescript
await walletStorage.storeWallet(
  wallet.address,
  wallet.privateKey,    // Stored encrypted
  mnemonicPhrase        // Stored encrypted
);
```

**Concerns:**
- Private keys stored in cloud database (even if encrypted)
- No hardware wallet support
- No biometric authentication mentioned
- `disconnectWallet()` deletes from Supabase but doesn't clear React state immediately in all cases

### 4.3 Rate Limiting

**Location:** `src/lib/rateLimiter.ts` (referenced in `BlackPaymentsWallet.ts:215`)

Uses in-memory rate limiting. This is fine for single-instance but:
- Won't work across multiple server instances
- No persistent rate limit state
- No user-specific rate limits (only action-based)

---

## 5. Frontend Analysis

### 5.1 State Management

**Location:** `src/stores/walletStore.ts`

Uses Zustand for global state. The store manages:
- Account address
- Selected chain
- Balances (native + USDT)
- USD value
- Authentication state
- Modal visibility

**Issue:** The store appears to be a large "god store" handling many concerns. Consider splitting into:
- `authStore`
- `balanceStore`
- `uiStore`

### 5.2 React Hooks

| Hook | Purpose | Quality |
|------|---------|---------|
| `useWallet` | Wallet creation/import | Good, but stores private keys in state |
| `useWalletAuth` | Authentication flow | Complex (16KB), handles password + encryption |
| `useWalletBalance` | Balance fetching | Good, uses SWR-like pattern |

### 5.3 UI Components

- `WalletConnectModal` - WalletConnect integration
- `QRCode` - Deposit address QR codes
- `TransactionStatus` - Transaction tracking
- `ErrorBoundary` - Error handling
- `Toast` - Notifications

---

## 6. API & Backend

### 6.1 Supabase Integration

**Files:** `src/supabase/`, `src/lib/profileApi.ts`

- User profiles
- Wallet storage (encrypted)
- Transaction history
- KYC data
- P2P orderbook

### 6.2 API Routes

**Location:** `src/app/api/`

Only CSRF token endpoint found. Most logic is client-side calling Supabase directly.

---

## 7. Testing

### 7.1 Test Suite

**Location:** `tests/`

| File | Tests | Coverage |
|------|-------|----------|
| `providers.test.ts` | Provider registry | Good |
| `factory.test.ts` | Wallet creation | Good |
| `validation.test.ts` | Input validation | Good |
| `walletUtils.test.ts` | Utility functions | Good |
| `faucet.test.ts` | Testnet faucet | Basic |

**Issues:**
- No tests for `BlackPaymentsWallet` core methods
- No tests for `HotWallet`/`ColdWallet`
- No tests for `SplitCustodyManager`
- No integration tests for full send flow

### 7.2 E2E Tests

**Location:** `e2e/`

- `auth.spec.ts` - Authentication flow
- `settings.spec.ts` - Settings page

Uses Playwright. Limited coverage.

---

## 8. Build & Configuration Issues

### 8.1 TypeScript Errors

**File:** `tsc-output.txt` (35KB of errors)

Major categories:
1. **Module resolution** - Many `Cannot find module` errors
2. **Type mismatches** - `ethers` v5 vs v6 API differences
3. **Missing exports** - `AdapterStrategy` exported but not defined
4. **JSX issues** - React type conflicts

### 8.2 `tsconfig.json` Issues

```json
{
  "skipLibCheck": true,   // Line 6
  "skipLibCheck": true    // Line 17 - DUPLICATE
}
```

### 8.3 Package.json Concerns

| Dependency | Issue |
|------------|-------|
| `ethers: ^6.11.0` | v6 has breaking changes from v5 |
| `@web3modal/ethers: ^4.0.0` | May conflict with custom provider system |
| `@alchemy/aa-*` | Account abstraction dependencies present but may not be fully integrated |
| `tronweb: ^6.2.2` | TRON support dependency but no TRON implementation found |
| `@types/jest: ^30.0.0` | Very new version, may have compatibility issues with jest 29 |

---

## 9. Dead Code & Unused Features

| Feature | Status | Notes |
|---------|--------|-------|
| `ProviderRegistry` | **Unused** | Built but not integrated with `BlackPaymentsWallet` |
| `Web3Provider` | **Unused** | Exists but not used in main flow |
| `MobileAdapter` | **Unused** | Built for React Native but `mobile/` dir excluded from build |
| `AlchemyAccountAbstraction` | **Partial** | File exists but integration unclear |
| `wdk-docs-main/` | **Dead** | Documentation from external SDK, not part of this project |
| `src/examples/` | **Dead** | Excluded from tsconfig |
| `src/i18n/` | **Dead** | Excluded from tsconfig |

---

## 10. Key Architectural Gaps

### 10.1 Multi-Chain Support Gap

**Current State:**
- `WalletChain` enum: 15 chains
- `BlackPaymentsWallet`: 9 EVM chains only
- `ProviderRegistry`: 6 chain types (ethereum, solana, bitcoin, cosmos, ton, aptos)
- Actual USDT support: 9 EVM chains + TRON (theoretically)

**Gap:** Non-EVM chains are defined in types/configs but have no working implementation.

### 10.2 Provider Integration Gap

The `ProviderRegistry` system is a complete, well-designed abstraction layer that is completely disconnected from the main wallet. This represents significant unused engineering effort.

### 10.3 Smart Wallet Integration

`BlackPaymentsSmartWallet.ts` (19KB) implements ERC-4337 account abstraction but:
- Not exported from main `index.ts`
- Not referenced by `BlackPaymentsWallet`
- No clear integration path

---

## 11. Recommendations Priority

### P0 (Critical - Fix Immediately)

1. **Add missing `logger` import to `ColdWallet.ts`**
2. **Fix `formatNativeBalance` to use chain-specific decimals**
3. **Add RPC URL validation (fail fast on empty strings)**
4. **Remove or integrate `ProviderRegistry` with `BlackPaymentsWallet`**

### P1 (High - Fix Soon)

5. **Implement actual multi-chain USDT support** or clearly document EVM-only limitation
6. **Add retry logic for RPC calls**
7. **Fix TypeScript compilation errors** (35KB of errors)
8. **Add tests for core wallet operations**
9. **Remove dead code** (`wdk-docs-main`, unused exports)

### P2 (Medium - Technical Debt)

10. **Split Zustand store** into domain-specific stores
11. **Add persistent rate limiting** (Redis/database)
12. **Implement actual multi-sig verification** in `ColdWallet`
13. **Add hardware wallet support**
14. **Create proper API layer** instead of direct Supabase calls from components

### P3 (Low - Nice to Have)

15. **Add connection pooling for RPC**
16. **Implement proper error boundaries** with recovery
17. **Add metrics/monitoring**
18. **Create SDK documentation from code**

---

## 12. Code Quality Metrics

| Metric | Value | Assessment |
|--------|-------|------------|
| Total TypeScript files | ~80 | Medium project |
| Largest file | `src/app/profile/page.tsx` (39KB) | Needs refactoring |
| Core wallet file | `BlackPaymentsWallet.ts` (589 lines) | Well-structured |
| Test coverage | ~5 test files | Low for project size |
| TypeScript errors | ~35KB of errors | Critical |
| Unused exports | Multiple | Technical debt |
| Duplicate code | USDT_ABI in 3 files | Should be shared |

---

## 13. Conclusion

The BlackPayments Wallet is a **medium-complexity multi-chain wallet project** with:

**Strengths:**
- Well-structured core wallet class
- Comprehensive security features (split custody, whitelist, multi-sig)
- Good separation of concerns in provider system
- Modern tech stack (Next.js 14, TypeScript, ethers v6)

**Critical Weaknesses:**
1. **TypeScript doesn't compile** (35KB of errors)
2. **Multi-chain support is misleading** - only EVM works
3. **Provider system is orphaned** - built but unused
4. **Security gaps** - private keys in cloud storage, no actual multi-sig verification
5. **Missing integration** - Smart wallet, account abstraction not connected

**Overall Assessment:** The project has solid foundations but needs significant cleanup and integration work before it can be considered production-ready. The most urgent issues are the TypeScript compilation errors and the disconnect between the claimed multi-chain support and actual implementation.
