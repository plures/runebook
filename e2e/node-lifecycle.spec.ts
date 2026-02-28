import { test, expect } from '@playwright/test';

const BASE_URL = 'http://127.0.0.1:4173/';

test.describe('node lifecycle', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(BASE_URL);
    page.on('dialog', dialog => dialog.accept());
  });

  test('adds a text card to the canvas via toolbar button', async ({ page }) => {
    await page.locator('.toolbar-nav button[title="Add Text Card"]').click();
    await expect(page.locator('.node-wrapper')).toHaveCount(1);
    await expect(page.locator('.card-title')).toBeVisible();
  });

  test('adds multiple text cards to the canvas', async ({ page }) => {
    const addBtn = page.locator('.toolbar-nav button[title="Add Text Card"]');
    await addBtn.click();
    await addBtn.click();
    await addBtn.click();
    await expect(page.locator('.node-wrapper')).toHaveCount(3);
  });

  test('clears all cards from the canvas', async ({ page }) => {
    const addBtn = page.locator('.toolbar-nav button[title="Add Text Card"]');
    await addBtn.click();
    await addBtn.click();
    await expect(page.locator('.node-wrapper')).toHaveCount(2);

    await page.locator('.toolbar-nav button[title="Clear all cards"]').click();
    await expect(page.locator('.node-wrapper')).toHaveCount(0);
  });

  test('text card has a title input', async ({ page }) => {
    await page.locator('.toolbar-nav button[title="Add Text Card"]').click();
    await expect(page.locator('.card-title')).toBeVisible();
  });

  test('text card title can be edited', async ({ page }) => {
    await page.locator('.toolbar-nav button[title="Add Text Card"]').click();
    const titleInput = page.locator('.card-title');
    await titleInput.fill('My New Note');
    await expect(titleInput).toHaveValue('My New Note');
  });

  test('text card body switches to edit mode on double-click', async ({ page }) => {
    await page.locator('.toolbar-nav button[title="Add Text Card"]').click();
    await page.locator('.card-body').dblclick();
    await expect(page.locator('.card-textarea')).toBeVisible();
  });
});
