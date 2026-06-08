import { test, expect } from '@playwright/test';

test.describe('Settings Page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/settings');
  });

  test('should display settings page', async ({ page }) => {
    await expect(page.locator('h1, h2').first()).toBeVisible();
  });

  test('should show testnet mode toggle', async ({ page }) => {
    // Look for testnet toggle/switch
    const testnetToggle = page.locator('[role="switch"], button:has-text("Testnet")');
    await expect(testnetToggle.first()).toBeVisible();
  });
});

test.describe('Testnet Faucet', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/settings');
    // Enable testnet mode if not already
    const testnetToggle = page.locator('[role="switch"], button:has-text("Testnet")').first();
    if (await testnetToggle.isVisible()) {
      await testnetToggle.click();
    }
  });

  test('should display testnet faucet section', async ({ page }) => {
    // Look for faucet-related content
    const faucetSection = page.locator('text=/faucet|test.*funds|get.*test/i');
    await expect(faucetSection.first()).toBeVisible({ timeout: 5000 });
  });

  test('should show testnet chains', async ({ page }) => {
    // Look for chain selectors
    const chainSelector = page.locator('select, [role="combobox"]').first();
    await expect(chainSelector).toBeVisible({ timeout: 5000 });
  });

  test('should show faucet button', async ({ page }) => {
    // Look for request funds or faucet button
    const faucetButton = page.locator('button:has-text("Request"), button:has-text("Faucet")');
    await expect(faucetButton.first()).toBeVisible({ timeout: 5000 });
  });
});

test.describe('Send Page', () => {
  test('should display send form', async ({ page }) => {
    await page.goto('/send');
    
    // Check for recipient input
    const recipientInput = page.locator('input[type="text"], input[placeholder*="address" i]');
    await expect(recipientInput.first()).toBeVisible();
    
    // Check for amount input
    const amountInput = page.locator('input[type="number"], input[placeholder*="amount" i]');
    await expect(amountInput.first()).toBeVisible();
  });

  test('should show validation errors for invalid address', async ({ page }) => {
    await page.goto('/send');
    
    await page.fill('input[placeholder*="address" i]', 'invalid-address');
    await page.fill('input[placeholder*="amount" i]', '100');
    
    // Click send button
    const sendButton = page.locator('button:has-text("Send")');
    await sendButton.click();
    
    // Should show error
    await expect(page.locator('text=/invalid|error/i').first()).toBeVisible({ timeout: 5000 });
  });
});