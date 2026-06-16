import { test, expect } from '@playwright/test';

test.describe('Settings Page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/settings');
  });

  test('should display settings page', async ({ page }) => {
    await expect(page.locator('h1, h2').first()).toBeVisible();
  });

  test('should show production network status', async ({ page }) => {
    await expect(page.locator('text=/Production Network|Production mode enabled|Development mode detected/i')).toBeVisible({ timeout: 5000 });
  });

  test('should display default production chain', async ({ page }) => {
    await expect(page.locator('text=/Default Chain|NEXT_PUBLIC_DEFAULT_CHAIN/i')).toBeVisible({ timeout: 5000 });
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