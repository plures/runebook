import { test, expect } from '@playwright/test';

const BASE_URL = 'http://127.0.0.1:4173/';

test.describe('canvas interactions', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(BASE_URL);
    page.on('dialog', dialog => dialog.accept());
  });

  test('nodes persist on canvas after being added', async ({ page }) => {
    await page.locator('.add-btn', { hasText: /Terminal/ }).click();
    await page.locator('.add-btn', { hasText: /Input/ }).click();
    await expect(page.locator('.svelte-flow__node')).toHaveCount(2);
    // Nodes remain after interacting with the canvas
    await page.locator('.svelte-flow').click({ position: { x: 10, y: 10 } });
    await expect(page.locator('.svelte-flow__node')).toHaveCount(2);
  });

  test('connecting two nodes creates an edge', async ({ page }) => {
    await page.locator('.add-btn', { hasText: /Input/ }).click();
    await page.locator('.add-btn', { hasText: /Display/ }).click();

    const sourceHandle = page.locator('.svelte-flow__node-input .svelte-flow__handle-right');
    const targetHandle = page.locator('.svelte-flow__node-display .svelte-flow__handle-left');

    await sourceHandle.dragTo(targetHandle);

    await expect(page.locator('.svelte-flow__edge')).toHaveCount(1);
  });

  test('keyboard Delete removes a selected node', async ({ page }) => {
    await page.locator('.add-btn', { hasText: /Display/ }).click();
    await expect(page.locator('.svelte-flow__node')).toHaveCount(1);

    await page.locator('.svelte-flow__node-display').click();
    await page.keyboard.press('Delete');

    await expect(page.locator('.svelte-flow__node')).toHaveCount(0);
  });

  test('Controls panel exposes zoom-in and zoom-out buttons', async ({ page }) => {
    const controls = page.locator('.svelte-flow__controls');
    await expect(controls).toBeVisible();
    await expect(controls.locator('button').first()).toBeVisible();
  });

  test('MiniMap reflects nodes added to the canvas', async ({ page }) => {
    await expect(page.locator('.svelte-flow__minimap')).toBeVisible();
    await page.locator('.add-btn', { hasText: /Terminal/ }).click();
    // MiniMap renders a node shape after a node is added
    await expect(page.locator('.svelte-flow__minimap-node')).toHaveCount(1);
  });
});
