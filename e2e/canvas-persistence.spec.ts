import { test, expect } from "@playwright/test";

const BASE_URL = "http://127.0.0.1:4173/";

test.describe("canvas persistence", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(BASE_URL);
    page.on("dialog", (dialog) => dialog.accept());
  });

  test("save button is accessible and enabled", async ({ page }) => {
    const saveBtn = page.locator('.toolbar-nav button[title="Save board"]');
    await expect(saveBtn).toBeVisible();
    await expect(saveBtn).not.toBeDisabled();
  });

  test("load button is accessible and enabled", async ({ page }) => {
    const loadBtn = page.locator('.toolbar-nav button[title="Load board"]');
    await expect(loadBtn).toBeVisible();
    await expect(loadBtn).not.toBeDisabled();
  });

  test("saving and loading restores text cards", async ({ page }) => {
    // Add a card
    await page.locator('.toolbar-nav button[title="Add Text Card"]').click();
    await expect(page.locator(".node-wrapper")).toHaveCount(1);

    // Save it
    await page.locator('.toolbar-nav button[title="Save board"]').click();
    // Wait for save confirmation (button briefly shows ✅)
    await page.waitForTimeout(200);

    // Clear the canvas
    await page.locator('.toolbar-nav button[title="Clear all cards"]').click();
    await expect(page.locator(".node-wrapper")).toHaveCount(0);

    // Load — should restore the saved card
    await page.locator('.toolbar-nav button[title="Load board"]').click();
    await expect(page.locator(".node-wrapper")).toHaveCount(1);
  });

  test("auto-save persists across page reloads", async ({ page }) => {
    // Add a card and give auto-save time to fire (1 s debounce + buffer)
    await page.locator('.toolbar-nav button[title="Add Text Card"]').click();
    await page.waitForTimeout(1500);

    // Reload the page
    await page.reload();
    // After reload the auto-saved canvas should be restored
    await expect(page.locator(".node-wrapper")).toHaveCount(1);
  });
});
