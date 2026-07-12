import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');

// Fix 1: Rename Tempest TouchClient to TempestTouchClient in SDK files
const sdkDir = path.join(rootDir, 'packages/sdk/src');
const sdkFiles = fs.readdirSync(sdkDir).filter(f => f.endsWith('.js') || f.endsWith('.d.ts'));

for (const file of sdkFiles) {
  const filePath = path.join(sdkDir, file);
  let content = fs.readFileSync(filePath, 'utf-8');
  const original = content;
  
  // Replace the identifier Tempest TouchClient with TempestTouchClient
  // Be careful not to replace "Tempest Touch" in comments/strings
  content = content.replace(/Tempest TouchClient/g, 'TempestTouchClient');
  
  if (content !== original) {
    fs.writeFileSync(filePath, content);
    console.log(`Fixed: ${filePath}`);
  }
}

// Also fix test files in SDK
const sdkTestDir = path.join(rootDir, 'packages/sdk/test');
if (fs.existsSync(sdkTestDir)) {
  const testFiles = fs.readdirSync(sdkTestDir).filter(f => f.endsWith('.js'));
  for (const file of testFiles) {
    const filePath = path.join(sdkTestDir, file);
    let content = fs.readFileSync(filePath, 'utf-8');
    const original = content;
    content = content.replace(/Tempest TouchClient/g, 'TempestTouchClient');
    if (content !== original) {
      fs.writeFileSync(filePath, content);
      console.log(`Fixed: ${filePath}`);
    }
  }
}

// Also fix examples
const sdkExamplesDir = path.join(rootDir, 'packages/sdk/examples');
if (fs.existsSync(sdkExamplesDir)) {
  const exampleFiles = fs.readdirSync(sdkExamplesDir).filter(f => f.endsWith('.js'));
  for (const file of exampleFiles) {
    const filePath = path.join(sdkExamplesDir, file);
    let content = fs.readFileSync(filePath, 'utf-8');
    const original = content;
    content = content.replace(/Tempest TouchClient/g, 'TempestTouchClient');
    if (content !== original) {
      fs.writeFileSync(filePath, content);
      console.log(`Fixed: ${filePath}`);
    }
  }
}

// Also fix bin
const sdkBinDir = path.join(rootDir, 'packages/sdk/bin');
if (fs.existsSync(sdkBinDir)) {
  const binFiles = fs.readdirSync(sdkBinDir).filter(f => f.endsWith('.js'));
  for (const file of binFiles) {
    const filePath = path.join(sdkBinDir, file);
    let content = fs.readFileSync(filePath, 'utf-8');
    const original = content;
    content = content.replace(/Tempest TouchClient/g, 'TempestTouchClient');
    if (content !== original) {
      fs.writeFileSync(filePath, content);
      console.log(`Fixed: ${filePath}`);
    }
  }
}

// Fix 2: Fix corrupted import in webhook-test route
const webhookRoutePath = path.join(rootDir, 'src/app/api/businesses/[id]/webhook-test/route.ts');
let webhookContent = fs.readFileSync(webhookRoutePath, 'utf-8');
if (webhookContent.includes('luh vimport')) {
  webhookContent = webhookContent.replace('luh vimport', 'import');
  fs.writeFileSync(webhookRoutePath, webhookContent);
  console.log(`Fixed: ${webhookRoutePath}`);
}

// Fix 3: Fix function name with space in e2e test
const e2eTestPath = path.join(rootDir, 'tests/e2e/tempesttouch-payment-contract.spec.ts');
let e2eContent = fs.readFileSync(e2eTestPath, 'utf-8');
if (e2eContent.includes('seedTempest TouchCreateRoutes')) {
  e2eContent = e2eContent.replace(/seedTempest TouchCreateRoutes/g, 'seedTempestTouchCreateRoutes');
  fs.writeFileSync(e2eTestPath, e2eContent);
  console.log(`Fixed: ${e2eTestPath}`);
}

// Fix 4: Create missing card-payments.d.ts
const cardPaymentsDtsPath = path.join(sdkDir, 'card-payments.d.ts');
if (!fs.existsSync(cardPaymentsDtsPath)) {
  const cardPaymentsJsPath = path.join(sdkDir, 'card-payments.js');
  if (fs.existsSync(cardPaymentsJsPath)) {
    // Generate a basic .d.ts file from the .js file
    let jsContent = fs.readFileSync(cardPaymentsJsPath, 'utf-8');
    // Extract exports and create type definitions
    const dtsContent = `/**
 * Card Payments utilities for Tempest Touch SDK
 */

import { TempestTouchClient } from './client.js';

export interface CreateCardPaymentParams {
  apiKey?: string;
  client?: TempestTouchClient;
  businessId: string;
  amount: number;
  currency?: string;
  description?: string;
  metadata?: Record<string, unknown>;
}

export interface CardPayment {
  id: string;
  business_id: string;
  amount_usd: string;
  currency: string;
  status: string;
  stripe_payment_intent_id?: string;
  checkout_url?: string;
  expires_at?: string;
  created_at: string;
}

export interface CreateCardPaymentResponse {
  success: boolean;
  payment: CardPayment;
}

export function createCardPayment(params: CreateCardPaymentParams): Promise<CreateCardPaymentResponse>;
export function getCardPayment(paymentId: string): Promise<{ success: boolean; payment: CardPayment }>;
export function listCardPayments(businessId: string, limit?: number, offset?: number): Promise<{ success: boolean; payments: CardPayment[] }>;
`;
    fs.writeFileSync(cardPaymentsDtsPath, dtsContent);
    console.log(`Created: ${cardPaymentsDtsPath}`);
  }
}

console.log('\nAll fixes applied!');
