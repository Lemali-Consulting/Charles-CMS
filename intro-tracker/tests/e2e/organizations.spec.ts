import { test, expect } from "@playwright/test";

test("create and delete an organization", async ({ page }) => {
  const name = `Acme E2E ${Date.now()}`;

  await page.goto("/organizations");
  await page.getByRole("button", { name: "+ Add" }).click();
  await page.getByPlaceholder("Organization name").fill(name);
  await page.getByRole("button", { name: "Create", exact: true }).click();

  await expect(page.getByRole("heading", { name })).toBeVisible();

  page.once("dialog", (dialog) => dialog.accept());
  await page.getByRole("button", { name: "Delete" }).click();
  await expect(page.getByRole("heading", { name })).toHaveCount(0);
});
