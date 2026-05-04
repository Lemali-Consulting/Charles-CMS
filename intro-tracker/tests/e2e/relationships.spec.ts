import { test, expect, type Page } from "@playwright/test";

async function createPerson(page: Page, first: string, last: string) {
  await page.goto("/people");
  await page.getByRole("button", { name: "+ Add" }).click();
  await page.getByPlaceholder("First name").fill(first);
  await page.getByPlaceholder("Last name").fill(last);
  await page.getByRole("button", { name: "Create", exact: true }).click();
  await expect(page.getByRole("heading", { name: `${first} ${last}` })).toBeVisible();
}

async function createOrg(page: Page, name: string) {
  await page.goto("/organizations");
  await page.getByRole("button", { name: "+ Add" }).click();
  await page.getByPlaceholder("Organization name").fill(name);
  await page.getByRole("button", { name: "Create", exact: true }).click();
  await expect(page.getByRole("heading", { name })).toBeVisible();
}

test("create and delete a person-person relationship", async ({ page }) => {
  const stamp = Date.now();
  const a = `RelA${stamp}`;
  const b = `RelB${stamp}`;
  await createPerson(page, "Alice", a);
  await createPerson(page, "Bob", b);

  await page.goto("/relationships");
  await expect(page.getByRole("heading", { name: "Relationships" })).toBeVisible();
  await page.getByRole("button", { name: "+ Add Relationship" }).click();

  // Three selects in the create form: entity1, entity2, type
  await page.locator("select").nth(0).selectOption({ label: `Alice ${a}` });
  await page.locator("select").nth(1).selectOption({ label: `Bob ${b}` });

  await page.getByRole("button", { name: "Create", exact: true }).click();

  // Both names should now appear together in the person-person list row
  const row = page
    .locator("div.bg-white.rounded-lg")
    .filter({ hasText: `Alice ${a}` })
    .filter({ hasText: `Bob ${b}` });
  await expect(row).toBeVisible();

  await row.getByRole("button", { name: "×" }).click();
  await expect(page.getByText(`Alice ${a}`, { exact: true })).toHaveCount(0);
});

test("create an org-person relationship", async ({ page }) => {
  const stamp = Date.now();
  const personLast = `OPRel${stamp}`;
  const orgName = `OPOrg ${stamp}`;
  await createPerson(page, "Cora", personLast);
  await createOrg(page, orgName);

  await page.goto("/relationships");
  await page.getByRole("button", { name: /Org ↔ Person/ }).click();
  await page.getByRole("button", { name: "+ Add Relationship" }).click();

  await page.locator("select").nth(0).selectOption({ label: orgName });
  await page.locator("select").nth(1).selectOption({ label: `Cora ${personLast}` });
  await page.getByRole("button", { name: "Create", exact: true }).click();

  const row = page
    .locator("div.bg-white.rounded-lg")
    .filter({ hasText: orgName })
    .filter({ hasText: `Cora ${personLast}` });
  await expect(row).toBeVisible();
});

test("introduction auto-creates an 'Introduced' person-person relationship", async ({ page }) => {
  const stamp = Date.now();
  const aLast = `Intro${stamp}A`;
  const bLast = `Intro${stamp}B`;
  await createPerson(page, "Dee", aLast);
  await createPerson(page, "Eve", bLast);

  await page.goto("/interactions");
  await page.getByRole("button", { name: "+ Add" }).click();
  await page.getByPlaceholder("Type a name...").fill(`Dee ${aLast}`);
  await page.getByRole("option", { name: new RegExp(`Dee ${aLast}`) }).first().click();
  await page.getByPlaceholder("Type a name to add...").fill(`Eve ${bLast}`);
  await page.getByRole("option", { name: new RegExp(`Eve ${bLast}`) }).first().click();
  await page.getByRole("button", { name: "Create", exact: true }).click();

  await page.goto("/relationships");
  await expect(page.getByText(`Dee ${aLast}`, { exact: true }).first()).toBeVisible();
  await expect(page.getByText(`Eve ${bLast}`, { exact: true }).first()).toBeVisible();
  await expect(page.getByText("Introduced").first()).toBeVisible();
});
