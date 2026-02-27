import { test, expect } from '@playwright/test';

const BASE_URL = 'http://127.0.0.1:4173/';

test.describe('canvas load', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(BASE_URL);
  });

  test('app loads with a non-blank page', async ({ page }) => {
    await expect(page.locator('body')).toContainText(/\S+/);
  });

  test('canvas container is visible', async ({ page }) => {
    await expect(page.locator('.canvas-container')).toBeVisible();
  });

  test('canvas starts with no nodes', async ({ page }) => {
    await expect(page.locator('.node-wrapper')).toHaveCount(0);
  });

  test('command bar shows all four Add Nodes buttons', async ({ page }) => {
    await expect(page.locator('.cmd-btn', { hasText: /Terminal/ })).toBeVisible();
    await expect(page.locator('.cmd-btn', { hasText: /Input/ })).toBeVisible();
    await expect(page.locator('.cmd-btn', { hasText: /Display/ })).toBeVisible();
    await expect(page.locator('.cmd-btn', { hasText: /Transform/ })).toBeVisible();
  });

  test('command bar shows canvas action buttons', async ({ page }) => {
    await expect(page.locator('.cmd-btn', { hasText: /Load Example/ })).toBeVisible();
    await expect(page.locator('.cmd-btn', { hasText: /Save to Storage/ })).toBeVisible();
    await expect(page.locator('.cmd-btn', { hasText: /Saved Canvases/ })).toBeVisible();
    await expect(page.locator('.cmd-btn', { hasText: /Export YAML/ })).toBeVisible();
  });
});
