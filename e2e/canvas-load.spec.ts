import { test, expect } from '@playwright/test';

const BASE_URL = 'http://127.0.0.1:4173/';

test.describe('canvas load', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(BASE_URL);
  });

  test('app loads with a non-blank page', async ({ page }) => {
    await expect(page.locator('body')).toContainText(/\S+/);
  });

  test('SvelteFlow canvas is rendered', async ({ page }) => {
    await expect(page.locator('.svelte-flow')).toBeVisible();
  });

  test('canvas starts with no nodes', async ({ page }) => {
    await expect(page.locator('.svelte-flow__node')).toHaveCount(0);
  });

  test('command bar shows all four Add Node buttons', async ({ page }) => {
    await expect(page.locator('.toolbar-btn', { hasText: /Terminal/ })).toBeVisible();
    await expect(page.locator('.toolbar-btn', { hasText: /Input/ })).toBeVisible();
    await expect(page.locator('.toolbar-btn', { hasText: /Display/ })).toBeVisible();
    await expect(page.locator('.toolbar-btn', { hasText: /Transform/ })).toBeVisible();
  });

  test('command bar shows toolbar buttons in bar-right', async ({ page }) => {
    await expect(page.locator('.command-bar .bar-right')).toBeVisible();
    await expect(page.locator('.toolbar-btn', { hasText: /Load Example/ })).toBeVisible();
  });

  test('MiniMap is rendered', async ({ page }) => {
    await expect(page.locator('.svelte-flow__minimap')).toBeVisible();
  });

  test('Controls panel is rendered', async ({ page }) => {
    await expect(page.locator('.svelte-flow__controls')).toBeVisible();
  });
});
