import { test, expect } from '@playwright/test';

const BASE_URL = 'http://127.0.0.1:4173/';

/**
 * Phase 1: Runebook is a canvas of text cards; there are no terminal nodes.
 * These tests verify the canvas renders correctly in Phase 1 baseline.
 */
test.describe('canvas phase1', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(BASE_URL);
  });

  test('canvas container is visible', async ({ page }) => {
    await expect(page.locator('.canvas-container')).toBeVisible();
  });

  test('zoom indicator is visible', async ({ page }) => {
    await expect(page.locator('.zoom-indicator')).toBeVisible();
  });

  test('toolbar navigation is visible', async ({ page }) => {
    await expect(page.locator('.toolbar-nav')).toBeVisible();
  });

  test('text card renders with input and output ports', async ({ page }) => {
    await page.locator('.toolbar-nav button[title="Add Text Card"]').click();
    await expect(page.locator('.node-wrapper .input-port')).toBeVisible();
    await expect(page.locator('.node-wrapper .output-port')).toBeVisible();
  });

  test('text card has a resize handle', async ({ page }) => {
    await page.locator('.toolbar-nav button[title="Add Text Card"]').click();
    await expect(page.locator('.node-wrapper .resize-handle')).toBeVisible();
  });
});
