import { defineConfig, devices } from "@playwright/test";
import path from "path";

const PORT = 3100;
const baseURL = `http://localhost:${PORT}`;
const dbDir = path.join(__dirname, "e2e-data");

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  reporter: "list",
  use: {
    baseURL,
    trace: "retain-on-failure",
  },
  projects: [
    {
      name: "setup",
      testMatch: /.*\.setup\.ts/,
    },
    {
      name: "chromium",
      use: {
        ...devices["Desktop Chrome"],
        storageState: "tests/e2e/.auth/user.json",
      },
      dependencies: ["setup"],
    },
  ],
  webServer: {
    command: `rm -rf ${dbDir} && mkdir -p ${dbDir} && next dev -p ${PORT}`,
    url: baseURL,
    timeout: 120_000,
    reuseExistingServer: !process.env.CI,
    env: {
      DB_DIR: dbDir,
      AUTH_SECRET: "e2e-test-secret-do-not-use-in-prod-aaaaaaaaaaaaaaaaaaa",
      AUTH_URL: baseURL,
      AUTH_ALLOWED_EMAILS: "e2e@test.local",
      AUTH_RESEND_KEY: "re_test_unused",
      AUTH_EMAIL_FROM: "E2E <noreply@test.local>",
    },
  },
});
