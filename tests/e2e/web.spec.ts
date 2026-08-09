import { expect, test } from '@playwright/test';

test('protects the dashboard route for anonymous users', async ({ page }) => {
  await page.goto('http://127.0.0.1:5173/dashboard');

  await expect(page.getByRole('heading', { name: 'Login' })).toBeVisible();
});
