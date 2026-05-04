import { test, expect } from "@playwright/test";

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
