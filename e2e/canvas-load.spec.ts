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

  test('toolbar shows all four Add Nodes buttons', async ({ page }) => {
    await expect(page.locator('.toolbar-btn', { hasText: /Terminal/ })).toBeVisible();
    await expect(page.locator('.toolbar-btn', { hasText: /Input/ })).toBeVisible();
    await expect(page.locator('.toolbar-btn', { hasText: /Display/ })).toBeVisible();
    await expect(page.locator('.toolbar-btn', { hasText: /Transform/ })).toBeVisible();
  });

  test('toolbar shows canvas action buttons', async ({ page }) => {
    await expect(page.locator('.toolbar-btn', { hasText: /Load Example/ })).toBeVisible();
    await expect(page.locator('.toolbar-btn', { hasText: /Save to Storage/ })).toBeVisible();
    await expect(page.locator('.toolbar-btn', { hasText: /Saved Canvases/ })).toBeVisible();
    await expect(page.locator('.toolbar-btn', { hasText: /Export YAML/ })).toBeVisible();
  });
});
