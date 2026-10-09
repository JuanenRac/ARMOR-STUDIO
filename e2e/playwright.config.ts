import { defineConfig } from "@playwright/test";

// A running Studio (and the server behind it) is needed:
//   ARMOR_STUDIO_URL       where Studio is served (default http://127.0.0.1:18081)
//   ARMOR_STUDIO_USER      an administrator of the server
//   ARMOR_STUDIO_PASSWORD  its password (never written to a file)
export default defineConfig({
  testDir: "./tests",
  testMatch: "**/*.e2e.ts",   // not *.spec.ts: the unit tests of Studio (vitest) would pick that up
  timeout: 60_000,
  retries: 0,
  workers: 1,
  reporter: [["list"]],
  use: {
    baseURL: process.env.ARMOR_STUDIO_URL ?? "http://127.0.0.1:18081",
    ignoreHTTPSErrors: true,
    channel: "msedge",   // the Edge that Windows already has: no browser to download (set to "chromium" after npm run install-browser to use Playwright's own)
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
});
