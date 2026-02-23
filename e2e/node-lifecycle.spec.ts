import { test, expect } from '@playwright/test';

const BASE_URL = 'http://127.0.0.1:4173/';

test.describe('node lifecycle', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(BASE_URL);
    // Dismiss any dialogs (alerts / confirms) automatically
    page.on('dialog', dialog => dialog.accept());
  });

  test('adds a terminal node to the canvas', async ({ page }) => {
    await page.locator('.toolbar-btn', { hasText: /Terminal/ }).click();
    await expect(page.locator('.terminal-node')).toBeVisible();
    await expect(page.locator('.node-wrapper')).toHaveCount(1);
  });

  test('adds an input node to the canvas', async ({ page }) => {
    await page.locator('.toolbar-btn', { hasText: /Input/ }).click();
    await expect(page.locator('.input-node')).toBeVisible();
    await expect(page.locator('.node-wrapper')).toHaveCount(1);
  });

  test('adds a display node to the canvas', async ({ page }) => {
    await page.locator('.toolbar-btn', { hasText: /Display/ }).click();
    await expect(page.locator('.display-node')).toBeVisible();
    await expect(page.locator('.node-wrapper')).toHaveCount(1);
  });

  test('adds a transform node to the canvas', async ({ page }) => {
    await page.locator('.toolbar-btn', { hasText: /Transform/ }).click();
    await expect(page.locator('.transform-node')).toBeVisible();
    await expect(page.locator('.node-wrapper')).toHaveCount(1);
  });

  test('adds multiple nodes to the canvas', async ({ page }) => {
    await page.locator('.toolbar-btn', { hasText: /Terminal/ }).click();
    await page.locator('.toolbar-btn', { hasText: /Input/ }).click();
    await page.locator('.toolbar-btn', { hasText: /Display/ }).click();
    await page.locator('.toolbar-btn', { hasText: /Transform/ }).click();
    await expect(page.locator('.node-wrapper')).toHaveCount(4);
  });

  test('clears all nodes from the canvas', async ({ page }) => {
    await page.locator('.toolbar-btn', { hasText: /Terminal/ }).click();
    await page.locator('.toolbar-btn', { hasText: /Input/ }).click();
    await expect(page.locator('.node-wrapper')).toHaveCount(2);

    // Toolbar "Clear" button has the danger class; the terminal node "Clear" does not
    await page.locator('.toolbar-btn.dd-btn--danger').click();

    await expect(page.locator('.node-wrapper')).toHaveCount(0);
  });
});
