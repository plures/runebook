import { test, expect } from '@playwright/test';

const BASE_URL = 'http://127.0.0.1:4173/';

test.describe('node lifecycle', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(BASE_URL);
    page.on('dialog', dialog => dialog.accept());
  });

  test('adds a terminal node to the canvas', async ({ page }) => {
    await page.locator('.add-btn', { hasText: /Terminal/ }).click();
    await expect(page.locator('.terminal-shell')).toBeVisible();
    await expect(page.locator('.svelte-flow__node')).toHaveCount(1);
  });

  test('adds an input node to the canvas', async ({ page }) => {
    await page.locator('.add-btn', { hasText: /Input/ }).click();
    await expect(page.locator('.input-shell')).toBeVisible();
    await expect(page.locator('.svelte-flow__node')).toHaveCount(1);
  });

  test('adds a display node to the canvas', async ({ page }) => {
    await page.locator('.add-btn', { hasText: /Display/ }).click();
    await expect(page.locator('.display-shell')).toBeVisible();
    await expect(page.locator('.svelte-flow__node')).toHaveCount(1);
  });

  test('adds a transform node to the canvas', async ({ page }) => {
    await page.locator('.add-btn', { hasText: /Transform/ }).click();
    await expect(page.locator('.transform-shell')).toBeVisible();
    await expect(page.locator('.svelte-flow__node')).toHaveCount(1);
  });

  test('adds multiple nodes to the canvas', async ({ page }) => {
    await page.locator('.add-btn', { hasText: /Terminal/ }).click();
    await page.locator('.add-btn', { hasText: /Input/ }).click();
    await page.locator('.add-btn', { hasText: /Display/ }).click();
    await page.locator('.add-btn', { hasText: /Transform/ }).click();
    await expect(page.locator('.svelte-flow__node')).toHaveCount(4);
  });

  test('removes a node when selected and Delete key is pressed', async ({ page }) => {
    await page.locator('.add-btn', { hasText: /Terminal/ }).click();
    await page.locator('.add-btn', { hasText: /Input/ }).click();
    await expect(page.locator('.svelte-flow__node')).toHaveCount(2);

    // Click the title bar (not the command-input area) to select the terminal node
    await page.locator('.terminal-shell .title-bar').click();
    // Wait for SvelteFlow to mark the node as selected
    await expect(page.locator('.svelte-flow__node-terminal.selected')).toBeVisible({ timeout: 3000 });
    await page.keyboard.press('Delete');

    await expect(page.locator('.svelte-flow__node')).toHaveCount(1, { timeout: 10000 });
  });
});
