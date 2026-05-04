import { test, expect } from "@playwright/test";

// These exercise the parseJson catch branch: a malformed body that
// JSON.parse genuinely chokes on. Playwright's request.fetch with data: ""
// turns into "no body" which Next happily parses as {}, so we drive these
// through the page's own fetch where the bytes are sent literally.
const cases = [
  { method: "PUT", path: "/api/people/1" },
  { method: "POST", path: "/api/people" },
  { method: "POST", path: "/api/organizations" },
  { method: "PUT", path: "/api/organizations/1" },
  { method: "POST", path: "/api/interactions" },
  { method: "POST", path: "/api/organizations/types" },
  { method: "POST", path: "/api/relationships/person-person" },
  { method: "POST", path: "/api/relationships/types/person-person" },
] as const;

for (const { method, path } of cases) {
  test(`${method} ${path} returns 400 on malformed JSON`, async ({ page }) => {
    await page.goto("/");
    const result = await page.evaluate(
      async ({ method, path }) => {
        const res = await fetch(path, {
          method,
          headers: { "content-type": "application/json" },
          body: "{ this is not json",
        });
        return { status: res.status, body: await res.json().catch(() => null) };
      },
      { method, path }
    );
    expect(result.status).toBe(400);
    expect(result.body?.error).toMatch(/Invalid or empty JSON body/);
  });
}

test("malformed JSON does not produce a 5xx response", async ({ page }) => {
  await page.goto("/");
  const status = await page.evaluate(async () => {
    const res = await fetch("/api/people/1", {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: "}}}",
    });
    return res.status;
  });
  expect(status).toBeGreaterThanOrEqual(400);
  expect(status).toBeLessThan(500);
});
