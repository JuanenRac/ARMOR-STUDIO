import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { readFileSync } from "node:fs";

// The server reads this file (next to the pages) to tell which version of Studio is being served.
const studioVersion = () => ({
  name: "armor-studio-version",
  generateBundle() {
    const { version } = JSON.parse(readFileSync(new URL("./package.json", import.meta.url), "utf8")) as { version: string };
    this.emitFile({ type: "asset", fileName: "version.json", source: JSON.stringify({ name: "armor-studio", version }) + "\n" });
  },
});

export default defineConfig({
  plugins: [react(), studioVersion()],
  // Bind the IPv4 loopback address explicitly.  Vite's default `localhost`
  // resolution may select IPv6 on Windows, leaving 127.0.0.1 unavailable.
  server: { host: "127.0.0.1", port: 5178, strictPort: true },
});
