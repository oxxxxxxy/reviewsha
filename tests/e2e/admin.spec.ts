import { expect, test } from '@playwright/test';

test('opens admin application dashboard route', async ({ page }) => {
  await page.goto('http://127.0.0.1:5174/dashboard');

  await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible();
});
