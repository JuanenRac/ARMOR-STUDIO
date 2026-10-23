import { defineConfig } from "@playwright/test";

// A running Studio (and the server behind it) is needed:
//   ARMOR_STUDIO_URL       where Studio is served (default http://127.0.0.1:18081)
//   ARMOR_STUDIO_USER      an administrator of the server
//   ARMOR_STUDIO_PASSWORD  its password (never written to a file)
//   ARMOR_E2E_CHANNEL      the browser: "msedge" (the default, the Edge of Windows), "chrome", or "chromium" for the one Playwright downloads (what the CI uses)
//   ARMOR_E2E_NGINX        "1" when Studio is served by the nginx of the container image: the tests of the proxy then run too
const channel = process.env.ARMOR_E2E_CHANNEL ?? "msedge";

export default defineConfig({
  testDir: "./tests",
  testMatch: "**/*.e2e.ts",   // not *.spec.ts: the unit tests of Studio (vitest) would pick that up
  timeout: 60_000,
  retries: process.env.CI ? 1 : 0,   // one second try in the CI only: a real failure fails twice
  workers: 1,
  reporter: [["list"]],
  use: {
    baseURL: process.env.ARMOR_STUDIO_URL ?? "http://127.0.0.1:18081",
    ignoreHTTPSErrors: true,
    ...(channel === "chromium" ? {} : { channel }),   // the Edge that Windows already has needs no download; "chromium" is the one `npm run install-browser` fetches
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
});
