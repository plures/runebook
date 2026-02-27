import { test, expect } from '@playwright/test';

const BASE_URL = 'http://127.0.0.1:4173/';

/**
 * Terminal node tests run against the web-preview build (no Tauri backend).
 * We verify the UI is correctly rendered and interactive; actual PTY execution
 * is a Tauri-only flow and is not exercised here.
 */
test.describe('terminal node', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(BASE_URL);
    await page.locator('.toolbar-btn', { hasText: /Terminal/ }).click();
  });

  test('terminal node is rendered with a header', async ({ page }) => {
    await expect(page.locator('.terminal-node')).toBeVisible();
    await expect(page.locator('.terminal-node .node-title')).toContainText('Terminal');
  });

  test('terminal node renders an xterm.js terminal container', async ({ page }) => {
    await expect(page.locator('.terminal-node .terminal-container')).toBeVisible();
    await expect(page.locator('.terminal-node .xterm')).toBeVisible();
  });

  test('terminal node shows a status indicator', async ({ page }) => {
    await expect(page.locator('.terminal-node .status-dot')).toBeVisible();
  });

  test('terminal node has an output port', async ({ page }) => {
    await expect(page.locator('.node-wrapper .output-port')).toBeVisible();
  });

  test('terminal node has an input port', async ({ page }) => {
    await expect(page.locator('.node-wrapper .input-port')).toBeVisible();
  });
});
