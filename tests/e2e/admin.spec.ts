import { expect, test } from '@playwright/test';

test('protects the admin dashboard route for anonymous users', async ({ page }) => {
  await page.goto('http://127.0.0.1:5174/dashboard');

  await expect(page.getByRole('heading', { name: 'Admin Login' })).toBeVisible();
});
