// Final rebrand: catch remaining coinpay references in source files
import { readFileSync, writeFileSync, renameSync, existsSync, readdirSync, statSync } from 'node:fs';
import { join, dirname } from 'node:path';

const REPLACEMENTS = [
  // npm package names
  [/@profullstack\/coinpay/g, '@profullstack/tempesttouch'],
  [/@coinpayportal\/sdk/g, '@tempesttouch/sdk'],
  [/coinpay-sdk/g, 'tempesttouch-sdk'],
  [/coinpay-php/g, 'tempesttouch-php'],
  // env vars
  [/COINPAY_/g, 'TEMPESTTOUCH_'],
  // CLI command
  [/coinpay /g, 'tempesttouch '],
  // general lowercase references
  [/coinpay/g, 'tempesttouch'],
  // display name
  [/CoinPay/g, 'Tempest Touch'],
  // domain
  [/coinpayportal\.com/g, 'tempesttouch.com'],
  // service name
  [/coinpayportal/g, 'tempesttouch'],
];

const FILES = [
  '.env.example',
  '.env.local',
  'package.json',
  'packages/sdk/package.json',
  'packages/extension/package.json',
  'plugins/wix/app/package.json',
  'plugins/shopify/app/package.json',
  'plugins/ecwid/app/package.json',
  'plugins/bigcommerce/app/package.json',
  'hooks/pre-commit',
  'Dockerfile',
  'bin/tempesttouch',
  'bin/coinpay-reputation-claim',
];

function processFile(filePath) {
  if (!existsSync(filePath)) return;
  let content = readFileSync(filePath, 'utf8');
  let original = content;
  for (const [pattern, replacement] of REPLACEMENTS) {
    content = content.replace(pattern, replacement);
  }
  if (content !== original) {
    writeFileSync(filePath, content);
    console.log(`Updated: ${filePath}`);
  }
}

for (const file of FILES) {
  processFile(file);
}

// Rename bin/coinpay-reputation-claim to bin/tempesttouch-reputation-claim
if (existsSync('bin/coinpay-reputation-claim')) {
  renameSync('bin/coinpay-reputation-claim', 'bin/tempesttouch-reputation-claim');
  console.log('Renamed: bin/coinpay-reputation-claim -> bin/tempesttouch-reputation-claim');
}

console.log('Final rebrand complete.');
