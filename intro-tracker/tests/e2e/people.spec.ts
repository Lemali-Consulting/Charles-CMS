import { test, expect } from "@playwright/test";

test("create, find, and delete a person", async ({ page }) => {
  const first = "TestPerson";
  const last = `E2E${Date.now()}`;
  const fullName = `${first} ${last}`;

  await page.goto("/people");
  await page.getByRole("button", { name: "+ Add" }).click();
  await page.getByPlaceholder("First name").fill(first);
  await page.getByPlaceholder("Last name").fill(last);
  await page.getByRole("button", { name: "Create", exact: true }).click();

  // Detail panel should now show the new person
  await expect(page.getByRole("heading", { name: fullName })).toBeVisible();

  // Search filter finds them in the list
  await page.getByPlaceholder("Search...").fill(last);
  await expect(page.getByText(fullName).first()).toBeVisible();

  // Delete and confirm gone
  page.once("dialog", (dialog) => dialog.accept());
  await page.getByRole("button", { name: "Delete" }).click();
  await expect(page.getByRole("heading", { name: fullName })).toHaveCount(0);
});

test("toggle category badges on a person", async ({ page }) => {
  const first = "Cat";
  const last = `Test${Date.now()}`;
  await page.goto("/people");
  await page.getByRole("button", { name: "+ Add" }).click();
  await page.getByPlaceholder("First name").fill(first);
  await page.getByPlaceholder("Last name").fill(last);
  await page.getByRole("button", { name: "Create", exact: true }).click();

  await expect(page.getByRole("heading", { name: `${first} ${last}` })).toBeVisible();

  // Activate Investor category from the toggle row
  await page.getByRole("button", { name: "Investor", exact: true }).click();
  // After toggling, the badge should appear in the list-side row
  await expect(page.getByText("Investor").first()).toBeVisible();

  page.once("dialog", (dialog) => dialog.accept());
  await page.getByRole("button", { name: "Delete" }).click();
});
