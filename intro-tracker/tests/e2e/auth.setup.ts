import { test, expect, request as pwRequest } from "@playwright/test";
import { encode } from "@auth/core/jwt";
import { randomUUID } from "crypto";
import path from "path";
import fs from "fs";
import Database from "better-sqlite3";

const authFile = path.join(__dirname, ".auth/user.json");
const TEST_EMAIL = "e2e@test.local";
const SECRET = "e2e-test-secret-do-not-use-in-prod-aaaaaaaaaaaaaaaaaaa";
const COOKIE_NAME = "authjs.session-token";

test("authenticate", async ({ request, baseURL }) => {
  // Trigger schema init by exercising the Auth.js signin endpoint (it touches
  // the adapter, which calls getDb() → initSchema).
  const csrf = await request.get(`${baseURL}/api/auth/csrf`);
  const { csrfToken } = await csrf.json();
  await request.post(`${baseURL}/api/auth/signin/resend`, {
    form: {
      email: "schema-init@invalid.local",
      csrfToken,
      callbackUrl: "/",
    },
    headers: { "content-type": "application/x-www-form-urlencoded" },
    maxRedirects: 0,
    failOnStatusCode: false,
  });

  const dbPath = path.join(process.cwd(), "e2e-data", "crm.db");
  const db = new Database(dbPath);
  let row = db
    .prepare("SELECT id, email, name FROM users WHERE lower(email) = lower(?)")
    .get(TEST_EMAIL) as { id: string; email: string; name: string | null } | undefined;
  if (!row) {
    const id = randomUUID();
    db.prepare("INSERT INTO users (id, email, name) VALUES (?, ?, ?)").run(
      id,
      TEST_EMAIL,
      "E2E User"
    );
    row = { id, email: TEST_EMAIL, name: "E2E User" };
  }
  db.close();

  const token = await encode({
    token: { sub: row.id, email: row.email, name: row.name ?? "E2E User" },
    secret: SECRET,
    salt: COOKIE_NAME,
    maxAge: 60 * 60 * 24,
  });

  fs.mkdirSync(path.dirname(authFile), { recursive: true });
  const url = new URL(baseURL!);
  fs.writeFileSync(
    authFile,
    JSON.stringify({
      cookies: [
        {
          name: COOKIE_NAME,
          value: token,
          domain: url.hostname,
          path: "/",
          expires: Math.floor(Date.now() / 1000) + 60 * 60 * 24,
          httpOnly: true,
          secure: false,
          sameSite: "Lax",
        },
      ],
      origins: [],
    })
  );

  const ctx = await pwRequest.newContext({ baseURL, storageState: authFile });
  const res = await ctx.get("/", { maxRedirects: 0 });
  expect(res.status()).toBe(200);
  await ctx.dispose();
});
