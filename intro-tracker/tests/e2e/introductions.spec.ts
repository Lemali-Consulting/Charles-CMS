import { test, expect, type Page } from "@playwright/test";

async function createPerson(page: Page, first: string, last: string) {
  await page.goto("/people");
  await page.getByRole("button", { name: "+ Add" }).click();
  await page.getByPlaceholder("First name").fill(first);
  await page.getByPlaceholder("Last name").fill(last);
  await page.getByRole("button", { name: "Create", exact: true }).click();
  await expect(page.getByRole("heading", { name: `${first} ${last}` })).toBeVisible();
}

test("log an introduction between two people", async ({ page }) => {
  const stamp = Date.now();
  await createPerson(page, "Alice", `E2E${stamp}`);
  await createPerson(page, "Bob", `E2E${stamp}`);

  await page.goto("/interactions");
  await page.getByRole("button", { name: "+ Add" }).click();

  // Person 1
  await page.getByPlaceholder("Type a name...").fill(`Alice E2E${stamp}`);
  await page.getByRole("option", { name: new RegExp(`Alice E2E${stamp}`) }).first().click();

  // Introduced to
  await page.getByPlaceholder("Type a name to add...").fill(`Bob E2E${stamp}`);
  await page.getByRole("option", { name: new RegExp(`Bob E2E${stamp}`) }).first().click();

  await page.getByRole("button", { name: "Create", exact: true }).click();

  // The new introduction should appear in the detail panel referencing both names
  await expect(page.getByText(new RegExp(`Alice E2E${stamp}`)).first()).toBeVisible();
  await expect(page.getByText(new RegExp(`Bob E2E${stamp}`)).first()).toBeVisible();
});
