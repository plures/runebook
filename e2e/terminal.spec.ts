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
    await page.locator('.cmd-btn', { hasText: /Terminal/ }).click();
  });

  test('terminal node is rendered with a header', async ({ page }) => {
    await expect(page.locator('.terminal-node')).toBeVisible();
    await expect(page.locator('.terminal-node .node-title')).toContainText('Terminal');
  });

  test('terminal node displays a command input with default command', async ({ page }) => {
    const input = page.locator('.terminal-node .command-input');
    await expect(input).toBeVisible();
    // Default command is set in CommandBar.svelte addTerminalNode()
    await expect(input).toHaveValue(/echo/);
  });

  test('terminal node shows output placeholder before execution', async ({ page }) => {
    await expect(page.locator('.output-placeholder')).toBeVisible();
    await expect(page.locator('.output-placeholder')).toContainText('No output yet');
  });

  test('run button is present and enabled before first execution', async ({ page }) => {
    const runBtn = page.locator('.terminal-node .run-btn-sm');
    await expect(runBtn).toBeVisible();
    await expect(runBtn).not.toBeDisabled();
  });

  test('clear button is present on the terminal node', async ({ page }) => {
    await expect(page.locator('.terminal-node .clear-btn-sm')).toBeVisible();
  });

  test('terminal node has an output port', async ({ page }) => {
    await expect(page.locator('.node-wrapper .output-port')).toBeVisible();
  });
});
