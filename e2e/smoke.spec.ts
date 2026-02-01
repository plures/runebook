import { test, expect } from '@playwright/test';

test('smoke: app loads and a button click works', async ({ page }) => {
  await page.goto('http://127.0.0.1:4173/');

  // Not a blank page.
  await expect(page.locator('body')).toContainText(/\S+/);

  // If there are any buttons, click the first and ensure DOM text changes.
  const btn = page.getByRole('button').first();
  if (await btn.count()) {
    const before = await page.locator('body').innerText();
    await btn.click();
    const after = await page.locator('body').innerText();
    expect(after).not.toEqual(before);
  }
});
