import { test, expect } from '@playwright/test';

const BASE_URL = 'http://127.0.0.1:4173/';

/**
 * Phase 1: reactive data flow tests cover text card content editing.
 */
test.describe('text card data flow', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(BASE_URL);
    // Add a text card so tests have something to interact with
    await page.locator('.toolbar-nav button[title="Add Text Card"]').click();
  });

  test('text card title input is editable', async ({ page }) => {
    const titleInput = page.locator('.card-title');
    await titleInput.fill('My Note');
    await expect(titleInput).toHaveValue('My Note');
  });

  test('text card body shows edit textarea on double-click', async ({ page }) => {
    await page.locator('.card-body').dblclick();
    const textarea = page.locator('.card-textarea');
    await expect(textarea).toBeVisible();
  });

  test('text card textarea accepts content input', async ({ page }) => {
    await page.locator('.card-body').dblclick();
    const textarea = page.locator('.card-textarea');
    await textarea.fill('Hello, Runebook!');
    await expect(textarea).toHaveValue('Hello, Runebook!');
  });

  test('text card textarea blurs back to view mode', async ({ page }) => {
    await page.locator('.card-body').dblclick();
    await expect(page.locator('.card-textarea')).toBeVisible();
    await page.locator('.card-body').press('Escape');
    // After blur, textarea goes away (view mode)
    await page.locator('.canvas-container').click();
    await expect(page.locator('.card-textarea')).toHaveCount(0);
  });

  test('multiple text cards can each hold independent content', async ({ page }) => {
    // Add a second card
    await page.locator('.toolbar-nav button[title="Add Text Card"]').click();
    const titles = page.locator('.card-title');
    await expect(titles).toHaveCount(2);

    await titles.first().fill('Card A');
    await titles.nth(1).fill('Card B');
    await expect(titles.first()).toHaveValue('Card A');
    await expect(titles.nth(1)).toHaveValue('Card B');
  });
});
