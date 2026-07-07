import { test, expect } from "@playwright/test";

test("assembles a memory game and verifies the Live App renders", async ({ page }) => {
  await page.goto("/");

  await expect(page.getByRole("heading", { name: "Playcraft Studio" })).toBeVisible({ timeout: 120_000 });
  await expect(page.getByRole("tab", { name: "Live App" })).toBeVisible({ timeout: 120_000 });
  await page.getByRole("tab", { name: "Live App" }).click();

  await expect(page.getByRole("textbox", { name: "Request" })).toBeVisible({ timeout: 120_000 });
  await page.getByRole("textbox", { name: "Request" }).fill("Memory game with dinosaurs");
  await page.getByRole("button", { name: "Generate Game" }).click();

  await expect(page.getByText("Memory Match MVP")).toBeVisible({ timeout: 120_000 });

  const memoryCards = page.locator(".memory-card");
  await expect(memoryCards.first()).toBeVisible({ timeout: 120_000 });
});
