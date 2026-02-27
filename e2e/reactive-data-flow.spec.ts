import { test, expect } from '@playwright/test';

const BASE_URL = 'http://127.0.0.1:4173/';

test.describe('reactive data flow', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(BASE_URL);
  });

  test('input node renders a text field', async ({ page }) => {
    await page.locator('.toolbar-btn', { hasText: /Input/ }).click();
    await expect(page.locator('.input-shell .field[type="text"]')).toBeVisible();
  });

  test('input node reflects typed value immediately', async ({ page }) => {
    await page.locator('.toolbar-btn', { hasText: /Input/ }).click();
    const inputField = page.locator('.input-shell .field[type="text"]');
    await inputField.fill('hello runebook');
    await expect(inputField).toHaveValue('hello runebook');
  });

  test('display node renders an empty waiting state', async ({ page }) => {
    await page.locator('.toolbar-btn', { hasText: /Display/ }).click();
    await expect(page.locator('.display-shell')).toBeVisible();
    await expect(page.locator('.display-shell .empty')).toBeVisible();
    await expect(page.locator('.display-shell .empty')).toContainText('Waiting for input');
  });

  test('transform node exposes a type selector and code editor', async ({ page }) => {
    await page.locator('.toolbar-btn', { hasText: /Transform/ }).click();
    const transformNode = page.locator('.transform-shell');
    await expect(transformNode.locator('.type-select')).toBeVisible();
    await expect(transformNode.locator('.code-editor')).toBeVisible();
  });

  test('transform node type can be changed', async ({ page }) => {
    await page.locator('.toolbar-btn', { hasText: /Transform/ }).click();
    const select = page.locator('.transform-shell .type-select');
    await select.selectOption('filter');
    await expect(select).toHaveValue('filter');
  });

  test('transform node code editor accepts input', async ({ page }) => {
    await page.locator('.toolbar-btn', { hasText: /Transform/ }).click();
    const codeArea = page.locator('.transform-shell .code-editor');
    await codeArea.fill('item > 5');
    await expect(codeArea).toHaveValue('item > 5');
  });
});
