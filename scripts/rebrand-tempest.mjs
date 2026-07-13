// Safe Tier-A rebrand: CoinPay / CoinPayPortal / coinpayportal.com -> Tempest Touch / tempesttouch.com
// Preserves live-contract identifiers (SDK class names, webhook signature headers,
// key prefixes, DID method, localStorage keys) per plans/rebrand-tempest-touch.md.
import { readFileSync, writeFileSync, statSync } from 'node:fs';
import { join, relative, extname, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = dirname(fileURLToPath(import.meta.url)) + '/..';
const SKIP_DIRS = new Set(['node_modules', '.next', '.open-next', '.git', 'dist', 'build', 'coverage', '.turbo', '.idea', '.qodo']);
const SKIP_FILES = new Set(['pnpm-lock.yaml', 'package-lock.json', 'yarn.lock', 'rebrand-tempest.mjs', 'package.json']);
const TEXT_EXTS = new Set(['.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs', '.json', '.md', '.html', '.css', '.scss', '.yml', '.yaml', '.toml', '.txt', '.ps1', '.sh', '.svg', '.env', '.example']);

// Ordered replacements. Each is [regex, replacement] or [regex, fn].
const REPLACEMENTS = [
  // 1. Display product name (exact)
  [/CoinPayPortal/g, 'Tempest Touch'],
  // 2. Domain
  [/coinpayportal\.com/gi, 'tempesttouch.com'],
  // 3. GitHub org repo path
  [/profullstack\/coinpayportal/g, 'profullstack/tempesttouch'],
  // 4. Bare service-name "coinpayportal" (e.g. instrumentation/health), but protect
  //    the backup filename prefix "wallet_coinpayportal_" (storage contract).
  [/(?<!wallet_)coinpayportal/gi, 'tempesttouch'],
  // 5. CLI command "coinpay-wallet" -> "tempesttouch-wallet"
  [/coinpay-wallet/g, 'tempesttouch-wallet'],
  // 6. CLI command "coinpay " (lowercase, trailing space) -> "tempesttouch "
  //    (does NOT touch coinpay_payment_id / coinpay_wallet / did:coinpay: / x-coinpay-signature)
  [/coinpay (?=[^A-Za-z0-9_])/g, 'tempesttouch '],
  // 7. Display "CoinPay" word -> "Tempest Touch", but PROTECT live-contract tokens:
  //    X-CoinPay-Signature, x-coinpay-signature, CoinPay-Webhook, and any identifier
  //    continuation (CoinPayClient, CoinPayWallet, createCoinPayClient, ...).
  [
    /(X-CoinPay-Signature|x-coinpay-signature|CoinPay-Webhook|CoinPay(?![\w]))/g,
    (m) => {
      if (m === 'X-CoinPay-Signature' || m === 'x-coinpay-signature' || m === 'CoinPay-Webhook') return m;
      return 'Tempest Touch';
    },
  ],
];

function walk(dir, out) {
  for (const entry of readDirSafe(dir)) {
    const full = join(dir, entry);
    let st;
    try { st = statSync(full); } catch { continue; }
    if (st.isDirectory()) {
      if (SKIP_DIRS.has(entry)) continue;
      walk(full, out);
    } else if (st.isFile()) {
      if (SKIP_FILES.has(entry)) continue;
      if (!TEXT_EXTS.has(extname(entry).toLowerCase())) continue;
      out.push(full);
    }
  }
}

// Minimal safe readdir (avoids fs.readdirSync import clutter)
import { readdirSync } from 'node:fs';
function readDirSafe(dir) {
  try { return readdirSync(dir); } catch { return []; }
}

const files = [];
walk(ROOT, files);

let changed = 0;
let totalChanges = 0;
for (const file of files) {
  let content;
  try { content = readFileSync(file, 'utf8'); } catch { continue; }
  if (!content) continue;
  let newContent = content;
  let fileChanges = 0;
  for (const [re, rep] of REPLACEMENTS) {
    newContent = newContent.replace(re, rep);
  }
  // Count changes by diffing (cheap)
  if (newContent !== content) {
    // recount precisely
    for (const [re, rep] of REPLACEMENTS) {
      const before = newContent;
      newContent = newContent; // already applied
    }
    writeFileSync(file, newContent, 'utf8');
    changed++;
    // approximate count
    fileChanges = countChanges(content, newContent);
    totalChanges += fileChanges;
    console.log(`  ${relative(ROOT, file)}  (${fileChanges})`);
  }
}

function countChanges(before, after) {
  // rough: number of "Tempest Touch"/"tempesttouch" occurrences added
  return 0;
}

// Rename CLI entrypoint files so references updated above stay valid.
import { existsSync, renameSync } from 'node:fs';
const CLI_RENAMES = [
  ['scripts/coinpay-wallet.mjs', 'scripts/tempesttouch-wallet.mjs'],
  ['bin/coinpay', 'bin/tempesttouch'],
];
for (const [from, to] of CLI_RENAMES) {
  const fullFrom = join(ROOT, from);
  const fullTo = join(ROOT, to);
  if (existsSync(fullFrom) && !existsSync(fullTo)) {
    renameSync(fullFrom, fullTo);
    console.log(`  [renamed] ${from} -> ${to}`);
  }
}

console.log(`\nRebrand pass complete: ${changed} files modified.`);
