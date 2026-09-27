import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
export default defineConfig({
  plugins: [react()],
  // Bind the IPv4 loopback address explicitly.  Vite's default `localhost`
  // resolution may select IPv6 on Windows, leaving 127.0.0.1 unavailable.
  server: { host: "127.0.0.1", port: 5178, strictPort: true },
});
