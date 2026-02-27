import { test, expect } from '@playwright/test';

const BASE_URL = 'http://127.0.0.1:4173/';

test.describe('reactive data flow', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(BASE_URL);
  });

  test('input node renders a text field', async ({ page }) => {
    await page.locator('.add-btn', { hasText: /Input/ }).click();
    await expect(page.locator('.input-shell .field[type="text"]')).toBeVisible();
  });

  test('input node reflects typed value immediately', async ({ page }) => {
    await page.locator('.add-btn', { hasText: /Input/ }).click();
    const inputField = page.locator('.input-shell .field[type="text"]');
    await inputField.fill('hello runebook');
    await expect(inputField).toHaveValue('hello runebook');
  });

  test('display node renders an empty waiting state', async ({ page }) => {
    await page.locator('.add-btn', { hasText: /Display/ }).click();
    await expect(page.locator('.display-shell')).toBeVisible();
    await expect(page.locator('.display-shell .empty')).toBeVisible();
    await expect(page.locator('.display-shell .empty')).toContainText('Waiting for input');
  });

  test('transform node exposes a code editor', async ({ page }) => {
    await page.locator('.add-btn', { hasText: /Transform/ }).click();
    const transformNode = page.locator('.transform-shell');
    await expect(transformNode.locator('.code-editor')).toBeVisible();
  });

  test('transform node shows its type as a badge', async ({ page }) => {
    await page.locator('.add-btn', { hasText: /Transform/ }).click();
    await expect(page.locator('.transform-shell .type-badge')).toBeVisible();
    await expect(page.locator('.transform-shell .type-badge')).toContainText('map');
  });

  test('transform node code editor accepts input', async ({ page }) => {
    await page.locator('.add-btn', { hasText: /Transform/ }).click();
    const codeArea = page.locator('.transform-shell .code-editor');
    await codeArea.fill('item > 5');
    await expect(codeArea).toHaveValue('item > 5');
  });
});
