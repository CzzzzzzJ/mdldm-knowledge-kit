import { defineConfig, devices } from "@playwright/test";

const port = 3210;
const testClientIp = `2001:db8::${Date.now().toString(16)}`;
const testMongoUri =
  process.env.E2E_MONGODB_URI ??
  "mongodb://127.0.0.1:27017/mdldm_knowledge_kit_e2e";

process.env.MONGODB_URI = testMongoUri;

export default defineConfig({
  testDir: "./e2e",
  globalSetup: "./e2e/global-setup.ts",
  timeout: 180_000,
  expect: {
    timeout: 15_000,
  },
  fullyParallel: false,
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
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  webServer: {
    command: `npm run dev -- --turbopack --hostname 127.0.0.1 --port ${port}`,
    env: {
      ...process.env,
      NEXT_DIST_DIR: ".next-e2e",
      MONGODB_URI: testMongoUri,
      AUTH_SECRET:
        process.env.AUTH_SECRET ??
        "playwright-local-secret-value-with-more-than-32-characters",
    },
    url: `http://127.0.0.1:${port}`,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
