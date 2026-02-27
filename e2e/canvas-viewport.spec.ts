import { test, expect } from '@playwright/test';

const BASE_URL = 'http://127.0.0.1:4173/';

test.describe('canvas viewport controls', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(BASE_URL);
  });

  test('zoom controls are visible on the canvas', async ({ page }) => {
    await expect(page.locator('.canvas-controls')).toBeVisible();
  });

  test('zoom indicator starts at 100%', async ({ page }) => {
    await expect(page.locator('.zoom-label')).toHaveText('100%');
  });

  test('zoom-in button increases zoom level', async ({ page }) => {
    await page.locator('.canvas-ctrl-btn', { hasText: '+' }).click();
    const label = await page.locator('.zoom-label').textContent();
    expect(parseInt(label ?? '100')).toBeGreaterThan(100);
  });

  test('zoom-out button decreases zoom level', async ({ page }) => {
    await page.locator('.canvas-ctrl-btn', { hasText: '−' }).click();
    const label = await page.locator('.zoom-label').textContent();
    expect(parseInt(label ?? '100')).toBeLessThan(100);
  });

  test('zoom-to-fit button is present', async ({ page }) => {
    await expect(page.locator('.canvas-ctrl-btn[title="Zoom to fit (all nodes)"]')).toBeVisible();
  });

  test('wheel zoom changes zoom level', async ({ page }) => {
    const canvas = page.locator('.canvas-container');
    const box = await canvas.boundingBox();
    if (!box) throw new Error('canvas-container not found');
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await page.mouse.wheel(0, -300); // negative deltaY = zoom in
    await expect(page.locator('.zoom-label')).not.toHaveText('100%');
    const label = await page.locator('.zoom-label').textContent();
    expect(parseInt(label ?? '100')).toBeGreaterThan(100);
  });

  test('empty-state overlay is visible when canvas has no nodes', async ({ page }) => {
    await expect(page.locator('.empty-state')).toBeVisible();
  });

  test('empty-state overlay disappears after adding a node', async ({ page }) => {
    await page.locator('.toolbar-btn', { hasText: /Terminal/ }).click();
    await expect(page.locator('.empty-state')).toHaveCount(0);
  });

  test('minimap is not rendered when canvas is empty', async ({ page }) => {
    await expect(page.locator('.minimap')).toHaveCount(0);
  });

  test('minimap appears after adding a node', async ({ page }) => {
    await page.locator('.toolbar-btn', { hasText: /Terminal/ }).click();
    await expect(page.locator('.minimap')).toBeVisible();
  });
});
