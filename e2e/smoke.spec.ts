import { test, expect } from "@playwright/test";

test("smoke: app loads", async ({ page }) => {
  await page.goto("http://127.0.0.1:4173/");

  // Page must be non-blank
  await expect(page.locator("body")).toContainText(/\S+/);

  // Canvas must be visible
  await expect(page.locator(".canvas-container")).toBeVisible();

  // Toolbar must have at least one button
  await expect(page.locator(".toolbar-nav button").first()).toBeVisible();
});
