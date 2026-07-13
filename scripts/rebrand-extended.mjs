// Extended rebrand: catch remaining coinpay references
import { readFileSync, writeFileSync, statSync, existsSync, renameSync } from 'node:fs';
import { join, relative, extname, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = dirname(fileURLToPath(import.meta.url)) + '/..';
const SKIP_DIRS = new Set(['node_modules', '.next', '.open-next', '.git', 'dist', 'build', 'coverage', '.turbo', '.idea', '.qodo', 'strix_runs']);
const SKIP_FILES = new Set(['pnpm-lock.yaml', 'package-lock.json', 'yarn.lock', 'rebrand-tempest.mjs', 'rebrand-extended.mjs', 'package.json', 'tsconfig.tsbuildinfo']);
const TEXT_EXTS = new Set(['.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs', '.json', '.md', '.html', '.css', '.scss', '.yml', '.yaml', '.toml', '.txt', '.ps1', '.sh', '.svg', '.env', '.example', '.php', '.log', '.sql', '.xml', '.phtml']);

const REPLACEMENTS = [
  // npm package names
  [/@profullstack\/coinpay/g, '@profullstack/tempesttouch'],
  [/coinpay-sdk/g, 'tempesttouch-sdk'],
  [/coinpay-php/g, 'tempesttouch-php'],
  // env vars
  [/COINPAY_/g, 'TEMPESTTOUCH_'],
  // CLI command
  [/coinpay /g, 'tempesttouch '],
  // general lowercase references (already partially done, but catch more)
  [/coinpay/g, 'tempesttouch'],
  // display name
  [/CoinPay/g, 'Tempest Touch'],
  // domain
  [/coinpayportal\.com/g, 'tempesttouch.com'],
  // service name
  [/coinpayportal/g, 'tempesttouch'],
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

import { readdirSync } from 'node:fs';
function readDirSafe(dir) {
  try { return readdirSync(dir); } catch { return []; }
}

const files = [];
walk(ROOT, files);

let changed = 0;
for (const file of files) {
  let content;
  try { content = readFileSync(file, 'utf8'); } catch { continue; }
  if (!content) continue;
  let newContent = content;
  for (const [re, rep] of REPLACEMENTS) {
    newContent = newContent.replace(re, rep);
  }
  if (newContent !== content) {
    writeFileSync(file, newContent, 'utf8');
    changed++;
    console.log(`  ${relative(ROOT, file)}`);
  }
}

// Rename CLI entrypoint files
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

console.log(`\nExtended rebrand pass complete: ${changed} files modified.`);
