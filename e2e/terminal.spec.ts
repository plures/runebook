import { test, expect } from '@playwright/test';

const BASE_URL = 'http://127.0.0.1:4173/';

/**
 * Terminal node tests run against the web-preview build (no Tauri backend).
 * We verify the UI is correctly rendered and interactive; actual command
 * execution is a Tauri-only flow and is not exercised here.
 */
test.describe('terminal node', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(BASE_URL);
    await page.locator('.add-btn', { hasText: /Terminal/ }).click();
  });

  test('terminal node is rendered with a title bar', async ({ page }) => {
    await expect(page.locator('.terminal-shell')).toBeVisible();
    await expect(page.locator('.terminal-shell .title')).toContainText('Terminal');
  });

  test('terminal node has a command input field', async ({ page }) => {
    await expect(page.locator('.command-input')).toBeVisible();
    await expect(page.locator('.command-input')).not.toBeDisabled();
  });

  test('terminal node shows output area', async ({ page }) => {
    await expect(page.locator('.terminal-body')).toBeVisible();
  });

  test('clear button is present on the terminal node', async ({ page }) => {
    await expect(page.locator('.terminal-shell .clear-btn')).toBeVisible();
  });

  test('command input accepts typed text', async ({ page }) => {
    const input = page.locator('.command-input');
    await input.fill('echo hello');
    await expect(input).toHaveValue('echo hello');
  });

  test('terminal node has input and output connection handles', async ({ page }) => {
    await expect(page.locator('.svelte-flow__node-terminal .svelte-flow__handle-left')).toBeVisible();
    await expect(page.locator('.svelte-flow__node-terminal .svelte-flow__handle-right')).toBeVisible();
  });
});
