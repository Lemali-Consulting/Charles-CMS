import { test, expect, type Page } from "@playwright/test";

async function createPersonWithCategory(page: Page, first: string, last: string, category: string) {
  await page.goto("/people");
  await page.getByRole("button", { name: "+ Add" }).click();
  await page.getByPlaceholder("First name").fill(first);
  await page.getByPlaceholder("Last name").fill(last);
  await page.getByRole("button", { name: "Create", exact: true }).click();
  await expect(page.getByRole("heading", { name: `${first} ${last}` })).toBeVisible();
  // The toggle uses fetch keepalive + optimistic UI, so navigating immediately
  // is safe — no waitForResponse needed.
  await page.getByRole("button", { name: category, exact: true }).click();
}

test("category-tagged introduction reflects in the matching trends tab", async ({ page }) => {
  const stamp = Date.now();
  await createPersonWithCategory(page, "Inv", `Trend${stamp}`, "Investor");
  await page.goto("/people");
  await page.getByRole("button", { name: "+ Add" }).click();
  await page.getByPlaceholder("First name").fill("Plain");
  await page.getByPlaceholder("Last name").fill(`Trend${stamp}`);
  await page.getByRole("button", { name: "Create", exact: true }).click();
  await expect(page.getByRole("heading", { name: `Plain Trend${stamp}` })).toBeVisible();

  await page.goto("/interactions");
  await page.getByRole("button", { name: "+ Add" }).click();
  await page.getByPlaceholder("Type a name...").fill(`Inv Trend${stamp}`);
  await page.getByRole("option", { name: new RegExp(`Inv Trend${stamp}`) }).first().click();
  await page.getByPlaceholder("Type a name to add...").fill(`Plain Trend${stamp}`);
  await page.getByRole("option", { name: new RegExp(`Plain Trend${stamp}`) }).first().click();
  await page.getByRole("button", { name: "Create", exact: true }).click();
  // Wait for the introduction list to update before navigating to /trends
  await expect(page.getByText(new RegExp(`Inv Trend${stamp}`)).first()).toBeVisible();

  await page.goto("/trends");
  await page.getByRole("button", { name: "Investor", exact: true }).click();
  const totals = await page.locator(".text-3xl").allInnerTexts();
  const investorTotal = parseInt(totals[0].trim(), 10);
  expect(investorTotal).toBeGreaterThan(0);
});

test("trends page renders stat cards and switches category tabs", async ({ page }) => {
  await page.goto("/trends");
  await expect(page.getByRole("heading", { name: "Trends" })).toBeVisible();

  // Three stat cards on the All tab
  await expect(page.getByText("Total Introductions")).toBeVisible();
  await expect(page.getByText("Avg / Month")).toBeVisible();
  await expect(page.getByText("Months Tracked")).toBeVisible();

  // Switching tabs shouldn't crash and the cards should remain rendered
  for (const tab of ["Investor", "Customer", "Talent", "All"]) {
    await page.getByRole("button", { name: tab, exact: true }).click();
    await expect(page.getByText("Total Introductions")).toBeVisible();
  }
});

test("trends totals are non-negative integers across tabs", async ({ page }) => {
  await page.goto("/trends");
  for (const tab of ["All", "Investor", "Customer", "Talent"]) {
    await page.getByRole("button", { name: tab, exact: true }).click();
    const totals = await page.locator(".text-3xl").allInnerTexts();
    expect(totals.length).toBeGreaterThanOrEqual(3);
    for (const t of totals.slice(0, 3)) {
      const n = parseInt(t.trim(), 10);
      expect(Number.isFinite(n)).toBe(true);
      expect(n).toBeGreaterThanOrEqual(0);
    }
  }
});
