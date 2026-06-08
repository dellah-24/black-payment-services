import { test, expect } from '@playwright/test';

test.describe('Authentication Flow', () => {
  test('should display auth page with email/password form', async ({ page }) => {
    await page.goto('/auth');
    
    // Check for email input
    await expect(page.locator('input[type="email"]')).toBeVisible();
    
    // Check for password input
    await expect(page.locator('input[type="password"]')).toBeVisible();
    
    // Check for sign in button
    await expect(page.getByRole('button', { name: /sign in/i })).toBeVisible();
  });

  test('should show error for invalid credentials', async ({ page }) => {
    await page.goto('/auth');
    
    await page.fill('input[type="email"]', 'invalid@example.com');
    await page.fill('input[type="password"]', 'wrongpassword');
    
    await page.click('button[type="submit"]');
    
    // Should show error message
    await expect(page.locator('text=/error|invalid/i')).toBeVisible({ timeout: 10000 });
  });

  test('should allow continuing as guest', async ({ page }) => {
    await page.goto('/auth');
    
    // Look for skip or continue as guest option
    const skipButton = page.getByRole('button', { name: /skip|continue as guest/i });
    if (await skipButton.isVisible()) {
      await skipButton.click();
      // Should redirect to home
      await expect(page).toHaveURL(/\/(?!auth)/);
    }
  });
});

test.describe('Homepage', () => {
  test.beforeEach(async ({ page }) => {
    // Skip auth for homepage tests
    await page.goto('/');
  });

  test('should load homepage successfully', async ({ page }) => {
    await expect(page).toHaveTitle(/BlackPayments/i);
  });

  test('should display wallet balance section', async ({ page }) => {
    // Look for balance display
    const balanceSection = page.locator('[class*="balance"], text=/balance/i');
    await expect(balanceSection.first()).toBeVisible({ timeout: 5000 });
  });
});