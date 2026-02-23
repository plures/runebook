import { test, expect } from '@playwright/test';

const BASE_URL = 'http://127.0.0.1:4173/';

test.describe('canvas persistence', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(BASE_URL);
    // Accept all browser dialogs (alert / confirm)
    page.on('dialog', dialog => dialog.accept());
  });

  test('saved canvases list starts empty on fresh load', async ({ page }) => {
    await page.locator('.toolbar-btn', { hasText: /Saved Canvases/ }).click();
    await expect(page.locator('.saved-list')).toBeVisible();
    await expect(page.locator('.empty-message')).toBeVisible();
    await expect(page.locator('.empty-message')).toContainText('No saved canvases');
  });

  test('saved canvas appears in the list after saving', async ({ page }) => {
    // Add a node so the canvas is non-empty (not required but realistic)
    await page.locator('.toolbar-btn', { hasText: /Terminal/ }).click();

    // Save canvas to localStorage (triggers an alert — auto-dismissed)
    await page.locator('.toolbar-btn', { hasText: /Save to Storage/ }).click();

    // Open the saved canvases list
    await page.locator('.toolbar-btn', { hasText: /Saved Canvases/ }).click();
    await expect(page.locator('.saved-list')).toBeVisible();

    // At least one saved entry should appear
    await expect(page.locator('.saved-item')).toHaveCount(1);
    await expect(page.locator('.saved-item').first()).toContainText('Untitled Canvas');
  });

  test('loading a saved canvas restores nodes on the canvas', async ({ page }) => {
    // Build and save a canvas with two nodes
    await page.locator('.toolbar-btn', { hasText: /Terminal/ }).click();
    await page.locator('.toolbar-btn', { hasText: /Input/ }).click();
    await expect(page.locator('.node-wrapper')).toHaveCount(2);

    await page.locator('.toolbar-btn', { hasText: /Save to Storage/ }).click();

    // Clear canvas to empty state
    await page.locator('.toolbar-btn.dd-btn--danger').click();
    await expect(page.locator('.node-wrapper')).toHaveCount(0);

    // Load the previously saved canvas
    await page.locator('.toolbar-btn', { hasText: /Saved Canvases/ }).click();
    await page.locator('.saved-item').first().click();

    // Both nodes should be restored
    await expect(page.locator('.node-wrapper')).toHaveCount(2);
  });

  test('Export YAML button is accessible', async ({ page }) => {
    await expect(page.locator('.toolbar-btn', { hasText: /Export YAML/ })).toBeVisible();
    await expect(page.locator('.toolbar-btn', { hasText: /Export YAML/ })).not.toBeDisabled();
  });

  test('Storage Settings panel toggles visibility', async ({ page }) => {
    // Panel is hidden initially
    await expect(page.locator('.storage-settings')).toHaveCount(0);

    // Click to open
    await page.locator('.toolbar-btn', { hasText: /Storage Settings/ }).click();
    await expect(page.locator('.storage-settings')).toBeVisible();

    // Click again to close
    await page.locator('.toolbar-btn', { hasText: /Storage Settings/ }).click();
    await expect(page.locator('.storage-settings')).toHaveCount(0);
  });
});
