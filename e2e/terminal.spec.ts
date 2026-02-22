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
    await page.locator('.toolbar-btn', { hasText: /Terminal/ }).click();
  });

  test('terminal node is rendered with a header', async ({ page }) => {
    await expect(page.locator('.terminal-node')).toBeVisible();
    await expect(page.locator('.terminal-node .node-title')).toContainText('Terminal');
  });

  test('terminal node displays the command to be executed', async ({ page }) => {
    await expect(page.locator('.command-display')).toBeVisible();
    // Default command set in Toolbar.svelte addTerminalNode()
    await expect(page.locator('.command-display code')).toContainText('echo');
    await expect(page.locator('.command-display code')).toContainText('Hello, RuneBook!');
  });

  test('terminal node shows output placeholder before execution', async ({ page }) => {
    await expect(page.locator('.output-placeholder')).toBeVisible();
    await expect(page.locator('.output-placeholder')).toContainText('No output yet');
  });

  test('run button is present and enabled before first execution', async ({ page }) => {
    const runBtn = page.locator('.run-btn');
    await expect(runBtn).toBeVisible();
    await expect(runBtn).not.toBeDisabled();
    await expect(runBtn).toContainText('Run');
  });

  test('clear button is present on the terminal node', async ({ page }) => {
    await expect(page.locator('.clear-btn')).toBeVisible();
    await expect(page.locator('.clear-btn')).toContainText('Clear');
  });

  test('terminal node has an output port', async ({ page }) => {
    await expect(page.locator('.terminal-node .output-port')).toBeVisible();
  });
});
