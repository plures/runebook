import { test, expect } from "@playwright/test";

const BASE_URL = "http://127.0.0.1:4173/";

test.describe("canvas load", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(BASE_URL);
  });

  test("app loads with a non-blank page", async ({ page }) => {
    await expect(page.locator("body")).toContainText(/\S+/);
  });

  test("canvas container is visible", async ({ page }) => {
    await expect(page.locator(".canvas-container")).toBeVisible();
  });

  test("canvas starts with no nodes", async ({ page }) => {
    await expect(page.locator(".node-wrapper")).toHaveCount(0);
  });

  test("toolbar shows the Add Text Card button", async ({ page }) => {
    // Phase 1 toolbar has the 📝 Add Text Card button
    const addBtn = page.locator(".toolbar-nav button").first();
    await expect(addBtn).toBeVisible();
    await expect(addBtn).toHaveAttribute("title", "Add Text Card");
  });

  test("toolbar shows save and load buttons", async ({ page }) => {
    await expect(
      page.locator('.toolbar-nav button[title="Save board"]'),
    ).toBeVisible();
    await expect(
      page.locator('.toolbar-nav button[title="Load board"]'),
    ).toBeVisible();
  });
});
