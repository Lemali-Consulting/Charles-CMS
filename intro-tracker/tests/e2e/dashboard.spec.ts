import { test, expect } from "@playwright/test";

test("dashboard renders stat cards", async ({ page }) => {
  await page.goto("/");
  await expect(page).toHaveURL("/");
  // Stat labels — match by visible text on the dashboard
  await expect(page.getByText("People", { exact: true }).first()).toBeVisible();
  await expect(page.getByText("Organizations", { exact: true }).first()).toBeVisible();
  await expect(page.getByText("This Month").first()).toBeVisible();
});

test("side nav links navigate to main sections", async ({ page }) => {
  await page.goto("/");
  await page.goto("/people");
  await expect(page.getByRole("heading", { name: "People" })).toBeVisible();
  await page.goto("/organizations");
  await expect(page.getByRole("heading", { name: "Organizations" })).toBeVisible();
  await page.goto("/interactions");
  await expect(page.getByRole("heading", { name: "Introductions" })).toBeVisible();
});
