import { test, expect } from '@playwright/test';

const BASE_URL = 'http://127.0.0.1:4173/';

test.describe('reactive data flow', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(BASE_URL);
  });

  test('input node renders a text field', async ({ page }) => {
    await page.locator('.toolbar-btn', { hasText: /Input/ }).click();
    await expect(page.locator('.input-node .input-field')).toBeVisible();
  });

  test('input node reflects typed value immediately', async ({ page }) => {
    await page.locator('.toolbar-btn', { hasText: /Input/ }).click();
    const inputField = page.locator('.input-node .input-field');
    await inputField.fill('hello runebook');
    await expect(inputField).toHaveValue('hello runebook');
  });

  test('display node renders a content area', async ({ page }) => {
    await page.locator('.toolbar-btn', { hasText: /Display/ }).click();
    await expect(page.locator('.display-node')).toBeVisible();
    // .text-display has padding so it's visible even when content is empty
    await expect(page.locator('.display-node .text-display')).toBeVisible();
  });

  test('display node shows content passed via node.content', async ({ page }) => {
    // Load the hello-world example which wires nodes together
    page.on('dialog', dialog => dialog.accept());
    await page.locator('.toolbar-btn', { hasText: /Load Example/ }).click();

    // The example canvas has 4 nodes: 1 terminal, 1 input, 2 displays
    await expect(page.locator('.node-wrapper')).toHaveCount(4);

    // User Input node is pre-populated with example text
    const inputField = page.locator('.input-node .input-field');
    await expect(inputField).toBeVisible();
    await expect(inputField).toHaveValue('Type something here...');
  });

  test('transform node exposes a type selector and code editor', async ({ page }) => {
    await page.locator('.toolbar-btn', { hasText: /Transform/ }).click();
    const transformNode = page.locator('.transform-node');
    await expect(transformNode.locator('select')).toBeVisible();
    await expect(transformNode.locator('textarea')).toBeVisible();
  });

  test('transform node type can be changed', async ({ page }) => {
    await page.locator('.toolbar-btn', { hasText: /Transform/ }).click();
    const select = page.locator('.transform-node select');
    await select.selectOption('filter');
    await expect(select).toHaveValue('filter');
  });

  test('transform node code editor accepts input', async ({ page }) => {
    await page.locator('.toolbar-btn', { hasText: /Transform/ }).click();
    const codeArea = page.locator('.transform-node textarea');
    await codeArea.fill('item > 5');
    await expect(codeArea).toHaveValue('item > 5');
  });
});
