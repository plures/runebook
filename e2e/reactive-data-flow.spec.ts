import { test, expect } from '@playwright/test';

const BASE_URL = 'http://127.0.0.1:4173/';

test.describe('reactive data flow', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(BASE_URL);
  });

  test('input node renders a text field', async ({ page }) => {
    await page.locator('.add-btn', { hasText: /Input/ }).click();
    await expect(page.locator('.input-shell .field')).toBeVisible();
  });

  test('input node reflects typed value immediately', async ({ page }) => {
    await page.locator('.add-btn', { hasText: /Input/ }).click();
    const inputField = page.locator('.input-shell .field').first();
    await inputField.fill('hello runebook');
    await expect(inputField).toHaveValue('hello runebook');
  });

  test('display node renders a content area', async ({ page }) => {
    await page.locator('.add-btn', { hasText: /Display/ }).click();
    await expect(page.locator('.display-shell')).toBeVisible();
    // empty state is shown when no upstream data is connected
    await expect(page.locator('.display-shell .empty')).toBeVisible();
  });

  test('transform node exposes a code editor', async ({ page }) => {
    await page.locator('.add-btn', { hasText: /Transform/ }).click();
    const transformNode = page.locator('.transform-shell');
    await expect(transformNode.locator('textarea')).toBeVisible();
  });

  test('transform node code editor accepts input', async ({ page }) => {
    await page.locator('.add-btn', { hasText: /Transform/ }).click();
    const codeArea = page.locator('.transform-shell textarea').first();
    await codeArea.fill('x => x.toUpperCase()');
    await expect(codeArea).toHaveValue('x => x.toUpperCase()');
  });
});
