import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import { existsSync, readFileSync } from "node:fs";

// The server reads this file (next to the pages) to tell which version of Studio is being served.
const studioVersion = () => ({
  name: "armor-studio-version",
  generateBundle() {
    const { version } = JSON.parse(readFileSync(new URL("./package.json", import.meta.url), "utf8")) as { version: string };
    this.emitFile({ type: "asset", fileName: "version.json", source: JSON.stringify({ name: "armor-studio", version }) + "\n" });
  },
});

// The coverage floor lives in docs/coverage_threshold.json (a number per measure, just under what the tests reach); `npm run coverage` fails below it, and the CI runs that when the file exists.
type Floor = { lines?: number; statements?: number; functions?: number; branches?: number };
const coverageFloor = (): Floor => {
  const path = new URL("./docs/coverage_threshold.json", import.meta.url);
  return existsSync(path) ? (JSON.parse(readFileSync(path, "utf8")) as Floor) : {};
};

export default defineConfig({
  plugins: [react(), studioVersion()],
  // Bind the IPv4 loopback address explicitly.  Vite's default `localhost`
  // resolution may select IPv6 on Windows, leaving 127.0.0.1 unavailable.
  server: { host: "127.0.0.1", port: 5178, strictPort: true },
  // Portuguese is fetched the first time it is chosen; the tests read every language, so it is there before any of them runs.
  test: {
    setupFiles: ["./src/testSetup.ts"],
    coverage: { provider: "v8", include: ["src/**/*.{ts,tsx}"], exclude: ["src/**/*.test.{ts,tsx}", "src/testSetup.ts", "src/testLive.tsx"], reporter: ["text", "text-summary"], thresholds: coverageFloor() },
  },
});
