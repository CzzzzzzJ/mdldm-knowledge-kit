import { defineConfig, devices } from "@playwright/test";

const port = 3211;
const testClientIp = `2001:db8:1::${Date.now().toString(16)}`;
const testMongoUri =
  process.env.E2E_MANUAL_MONGODB_URI ??
  "mongodb://127.0.0.1:27017/mdldm_knowledge_kit_manual_e2e";
const testAuthSecret =
  process.env.E2E_AUTH_SECRET ??
  "playwright-local-secret-value-with-more-than-32-characters";

process.env.APP_URL = `http://127.0.0.1:${port}`;
process.env.MONGODB_URI = testMongoUri;
process.env.AUTH_SECRET = testAuthSecret;
process.env.PAYMENT_PROVIDER = "manual";

export default defineConfig({
  testDir: "./e2e",
  testMatch: "manual-payment.spec.ts",
  globalSetup: "./e2e/global-setup.ts",
  timeout: 180_000,
  expect: {
    timeout: 15_000,
  },
  fullyParallel: false,
  workers: 1,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 2 : 0,
  reporter: process.env.CI ? "github" : "list",
  use: {
    baseURL: `http://127.0.0.1:${port}`,
    extraHTTPHeaders: {
      "x-forwarded-for": testClientIp,
    },
    trace: "on-first-retry",
  },
  projects: [
    {
      name: "chromium-manual",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  webServer: {
    command: `pnpm dev --turbopack --hostname 127.0.0.1 --port ${port}`,
    env: {
      ...process.env,
      NEXT_DIST_DIR: ".next-e2e",
      APP_URL: `http://127.0.0.1:${port}`,
      MONGODB_URI: testMongoUri,
      AUTH_SECRET: testAuthSecret,
      PAYMENT_PROVIDER: "manual",
    },
    url: `http://127.0.0.1:${port}`,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
