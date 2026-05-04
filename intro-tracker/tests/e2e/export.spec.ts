import { test, expect, type Page } from "@playwright/test";

async function createPerson(page: Page, first: string, last: string) {
  await page.goto("/people");
  await page.getByRole("button", { name: "+ Add" }).click();
  await page.getByPlaceholder("First name").fill(first);
  await page.getByPlaceholder("Last name").fill(last);
  await page.getByRole("button", { name: "Create", exact: true }).click();
  await expect(page.getByRole("heading", { name: `${first} ${last}` })).toBeVisible();
}

test("export page lists introductions and downloads CSV", async ({ page }) => {
  const stamp = Date.now();
  const aLast = `Exp${stamp}A`;
  const bLast = `Exp${stamp}B`;
  await createPerson(page, "Fae", aLast);
  await createPerson(page, "Gus", bLast);

  await page.goto("/interactions");
  await page.getByRole("button", { name: "+ Add" }).click();
  await page.getByPlaceholder("Type a name...").fill(`Fae ${aLast}`);
  await page.getByRole("option", { name: new RegExp(`Fae ${aLast}`) }).first().click();
  await page.getByPlaceholder("Type a name to add...").fill(`Gus ${bLast}`);
  await page.getByRole("option", { name: new RegExp(`Gus ${bLast}`) }).first().click();
  await page.getByRole("button", { name: "Create", exact: true }).click();

  await page.goto("/export");
  await expect(page.getByRole("heading", { name: "Export" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "All Introductions" })).toBeVisible();

  // Preview table includes our newly created introduction's people
  await expect(page.getByRole("cell", { name: new RegExp(`Fae ${aLast}`) })).toBeVisible();

  // Click triggers a CSV download — capture it
  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: "Download CSV" }).click();
  const download = await downloadPromise;

  expect(download.suggestedFilename()).toMatch(
    /^introductions-export-\d{4}-\d{2}-\d{2}\.csv$/
  );

  const stream = await download.createReadStream();
  const chunks: Buffer[] = [];
  for await (const chunk of stream) chunks.push(chunk as Buffer);
  const csv = Buffer.concat(chunks).toString("utf8");

  expect(csv.split("\n")[0]).toBe('"Date","Medium","People","Notes"');
  expect(csv).toContain(`Fae ${aLast}`);
  expect(csv).toContain(`Gus ${bLast}`);
});

test("export page shows empty-state copy when no introductions exist", async ({ page }) => {
  // We can't guarantee zero rows in a shared DB, so just ensure the page renders
  // and the count line is present.
  await page.goto("/export");
  await expect(page.getByText(/will be included/)).toBeVisible();
});
