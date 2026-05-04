import { test, expect } from "@playwright/test";

test.use({ storageState: { cookies: [], origins: [] } });

test("unauthenticated user is redirected to /login", async ({ page }) => {
  await page.goto("/");
  await expect(page).toHaveURL(/\/login/);
  await expect(page.getByRole("heading", { name: "Charles CMS" })).toBeVisible();
});

test("login form shows 'check your email' on submit", async ({ page }) => {
  await page.goto("/login");
  await page.getByLabel("Email").fill("e2e@test.local");
  await page.getByRole("button", { name: /Send login link/i }).click();
  await expect(page.getByText("Check your email")).toBeVisible();
});
