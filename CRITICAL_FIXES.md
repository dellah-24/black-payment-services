# Critical Security Fixes - Immediate Action Required

## 🔴 Priority 1: Fix These NOW

### 1. Hardcoded Salt (CRITICAL)
**File:** `src/wallet/crypto.ts:29`

**Current (VULNERABLE):**
```typescript
salt: encoder.encode('blackpayments_salt_v1')
```

**Fix:**
```typescript
// Generate unique salt per encryption
const salt = crypto.getRandomValues(new Uint8Array(16));
// Store salt with encrypted data
```

### 2. Private Key Exposure (HIGH)
**File:** `src/wallet/BlackPaymentsWallet.ts:148-150`

**Current (VULNERABLE):**
```typescript
getPrivateKey(chain: WalletChain): string | undefined {
  return this.wallets.get(chain)?.privateKey;
}
```

**Fix:**
```typescript
// Remove this method entirely
// Use secure key derivation instead
```

### 3. Weak Password Validation (MEDIUM)
**File:** `src/app/page.tsx:311-317`

**Current (WEAK):**
```typescript
function isPasswordStrong(pw: string) {
  if (pw.length < 8) return false;
  if (!/[a-zA-Z]/.test(pw) || !/[0-9]/.test(pw)) return false;
  return true;
}
```

**Fix:**
```typescript
function isPasswordStrong(pw: string): boolean {
  if (pw.length < 12) return false;
  if (!/[a-z]/.test(pw)) return false;
  if (!/[A-Z]/.test(pw)) return false;
  if (!/[0-9]/.test(pw)) return false;
  if (!/[!@#$%^&*]/.test(pw)) return false;
  return true;
}
```

---

## 🟠 Priority 2: Fix This Week

### 4. Duplicate Chain Configurations
**Files:** `src/app/page.tsx:65-106`, `src/config/chains.ts:19-119`

**Problem:** Same config in two places = bugs

**Fix:** Delete chain config from `page.tsx`, import from `config/chains.ts`

### 5. Monolithic Component (1244 lines)
**File:** `src/app/page.tsx`

**Fix:** Split into:
- `DashboardLayout.tsx` (200 lines)
- `WalletBalance.tsx` (150 lines)
- `TransactionHistory.tsx` (200 lines)
- `ChainSelector.tsx` (100 lines)
- `WalletActions.tsx` (200 lines)

### 6. Missing Input Sanitization
**File:** `src/app/page.tsx:259-286`

**Fix:**
```typescript
function sanitizeInput(input: string): string {
  return input.trim().replace(/[<>]/g, '');
}
```

---

## 🟡 Priority 3: Fix This Month

### 7. No Test Coverage
**Fix:** Add basic tests:
```typescript
// __tests__/crypto.test.ts
describe('encrypt/decrypt', () => {
  it('should encrypt and decrypt correctly', async () => {
    const plaintext = 'test';
    const key = 'secret';
    const encrypted = await encrypt(plaintext, key);
    const decrypted = await decrypt(encrypted, key);
    expect(decrypted).toBe(plaintext);
  });
});
```

### 8. Console.log in Production
**Fix:** Replace with proper logging:
```typescript
// lib/logger.ts
export const logger = {
  error: (msg: string, data?: any) => {
    if (process.env.NODE_ENV === 'production') {
      // Send to Sentry/LogRocket
    } else {
      console.error(msg, data);
    }
  }
};
```

### 9. Missing Rate Limiting
**Fix:**
```typescript
// middleware.ts
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const rateLimit = new Map();

export function middleware(request: NextRequest) {
  const ip = request.ip ?? '127.0.0.1';
  const now = Date.now();
  const windowMs = 15 * 60 * 1000; // 15 minutes
  const maxRequests = 100;

  if (!rateLimit.has(ip)) {
    rateLimit.set(ip, { count: 1, startTime: now });
  } else {
    const record = rateLimit.get(ip);
    if (now - record.startTime > windowMs) {
      rateLimit.set(ip, { count: 1, startTime: now });
    } else if (record.count >= maxRequests) {
      return NextResponse.json(
        { error: 'Too many requests' },
        { status: 429 }
      );
    } else {
      record.count++;
    }
  }

  return NextResponse.next();
}
```

---

## 📋 Quick Checklist

### Today (30 minutes)
- [ ] Remove `getPrivateKey()` method
- [ ] Fix password validation
- [ ] Add input sanitization

### This Week (4 hours)
- [ ] Consolidate chain configurations
- [ ] Add rate limiting middleware
- [ ] Remove console.log statements

### This Month (2 days)
- [ ] Split monolithic component
- [ ] Add basic tests
- [ ] Implement proper logging

---

## 🚨 If You Do Nothing Else

**At minimum, fix these 3 things:**

1. **Remove hardcoded salt** - This is a critical vulnerability
2. **Remove private key exposure** - This could lead to fund theft
3. **Strengthen password validation** - This protects user accounts

These three fixes alone will significantly improve security.

---

## 📞 Need Help?

Refer to:
- `CODEBASE_ANALYSIS.md` - Full detailed analysis
- OWASP Security Guidelines
- Next.js Security Best Practices
- ethers.js Documentation
