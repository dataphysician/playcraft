import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./tests",
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: 1,
  timeout: 120_000,
  reporter: "list",
  use: {
    baseURL: "http://127.0.0.1:5173",
    trace: "on-first-retry"
  },
  webServer: [
    {
      command: "pnpm --filter @playcraft/studio dev",
      url: "http://127.0.0.1:5173",
      timeout: 120000,
      reuseExistingServer: !process.env.CI
    },
    {
      command: "pnpm --filter @playcraft/service build && pnpm --filter @playcraft/service serve",
      url: "http://127.0.0.1:8787/health",
      timeout: 120000,
      reuseExistingServer: !process.env.CI
    }
  ],
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] }
    }
  ]
});
