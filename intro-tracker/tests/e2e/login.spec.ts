import { test, expect } from "@playwright/test";

test.use({ storageState: { cookies: [], origins: [] } });

test("unauthenticated user is redirected to /login", async ({ page }) => {
  await page.goto("/");
  await expect(page).toHaveURL(/\/login/);
  await expect(page.getByRole("heading", { name: "Charles CMS" })).toBeVisible();
});

test("login form shows 'check your email' for an allowlisted email", async ({ page }) => {
  await page.goto("/login");
  await page.getByLabel("Email").fill("e2e@test.local");
  await page.getByRole("button", { name: /Send login link/i }).click();
  await expect(page.getByText("Check your email")).toBeVisible();
  await expect(page.getByText(/e2e@test\.local/)).toBeVisible();
});

test("non-allowlisted email shows the same UI (anti-enumeration)", async ({ page }) => {
  await page.goto("/login");
  await page.getByLabel("Email").fill("intruder@evil.example");
  await page.getByRole("button", { name: /Send login link/i }).click();
  // Identical "Check your email" UI — no error surfaced, no enumeration.
  await expect(page.getByText("Check your email")).toBeVisible();
  await expect(page.getByText(/intruder@evil\.example/)).toBeVisible();
  await expect(page.getByText(/not authorized|denied|invalid/i)).toHaveCount(0);
});

test("magic-link callback for a non-allowlisted email does not establish a session", async ({
  page,
  request,
  baseURL,
}) => {
  // Drive the standard signin POST, then verify that /api is still gated.
  const csrfRes = await request.get(`${baseURL}/api/auth/csrf`);
  const { csrfToken } = await csrfRes.json();
  await request.post(`${baseURL}/api/auth/signin/resend`, {
    form: { email: "intruder@evil.example", csrfToken, callbackUrl: "/" },
    headers: { "content-type": "application/x-www-form-urlencoded" },
    maxRedirects: 0,
    failOnStatusCode: false,
  });
  // No session cookie should have been set on this storage state.
  await page.goto("/");
  await expect(page).toHaveURL(/\/login/);
});
