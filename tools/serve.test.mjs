import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { mkdtemp, mkdir, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

let server;
let base;

beforeAll(async () => {
  const dist = await mkdtemp(path.join(os.tmpdir(), "armor-studio-"));
  await mkdir(path.join(dist, "assets"));
  await writeFile(path.join(dist, "index.html"), "<!doctype html><title>studio</title>");
  await writeFile(path.join(dist, "assets", "app-abc.js"), "console.log(1)");
  process.env.ARMOR_STUDIO_DIST = dist;
  process.env.ARMOR_SERVER_ORIGIN = "http://10.0.0.5:18080";
  const { createStudioServer } = await import("./serve.mjs");
  server = createStudioServer();
  await new Promise(resolve => server.listen(0, "127.0.0.1", resolve));
  base = `http://127.0.0.1:${server.address().port}`;
});

afterAll(() => new Promise(resolve => server.close(resolve)));

describe("Studio static host", () => {
  it("serves the app with security headers", async () => {
    const response = await fetch(`${base}/`);
    expect(response.status).toBe(200);
    expect(response.headers.get("x-content-type-options")).toBe("nosniff");
    expect(response.headers.get("content-security-policy")).toContain("connect-src 'self' http://10.0.0.5:18080 ws://10.0.0.5:18080");
    expect(response.headers.get("content-security-policy")).toContain("frame-ancestors 'none'");
  });

  it("publishes the server origin the deployment configured", async () => {
    const body = await (await fetch(`${base}/armor-config.json`)).json();
    expect(body).toEqual({ serverOrigin: "http://10.0.0.5:18080" });
  });

  it("falls back to the app for client routes but not for missing files", async () => {
    expect((await fetch(`${base}/site/designer`)).status).toBe(200);
    expect((await fetch(`${base}/assets/missing.js`)).status).toBe(404);
  });

  it("caches hashed assets and never the entry page", async () => {
    expect((await fetch(`${base}/assets/app-abc.js`)).headers.get("cache-control")).toContain("immutable");
    expect((await fetch(`${base}/`)).headers.get("cache-control")).toBe("no-cache");
  });

  it("refuses path traversal and other methods", async () => {
    const traversal = await fetch(`${base}/..%2f..%2fetc%2fpasswd`);
    expect([400, 404, 200]).toContain(traversal.status);
    expect(await traversal.text()).not.toContain("root:");
    expect((await fetch(`${base}/`, { method: "POST" })).status).toBe(405);
  });
});

describe("more than one address for the same Studio", () => {
  const both = "http://192.168.0.180:18080, http://203.0.113.7:2600/";

  // The module reads its environment when it is first loaded, which beforeAll above arranges: it is imported here, not at the top.
  const load = () => import("./serve.mjs");

  it("reads a comma-separated list, normalised, and drops what is not an http origin", async () => {
    const { parseServerOrigins } = await load();
    expect(parseServerOrigins(both)).toEqual(["http://192.168.0.180:18080", "http://203.0.113.7:2600"]);
    expect(parseServerOrigins("javascript:alert(1), ftp://x, nonsense, http://a:1, http://a:1")).toEqual(["http://a:1"]);
    expect(parseServerOrigins(undefined)).toEqual([]);
  });

  it("lets the browser talk to every configured server", async () => {
    const { contentSecurityPolicyFor, parseServerOrigins } = await load();
    const policy = contentSecurityPolicyFor(parseServerOrigins(both));
    expect(policy).toContain("connect-src 'self' http://192.168.0.180:18080 ws://192.168.0.180:18080 http://203.0.113.7:2600 ws://203.0.113.7:2600;");
    expect(policy).toContain("img-src 'self' data: blob: http://192.168.0.180:18080 http://203.0.113.7:2600;");
  });

  it("offers a visitor the server with the host name they used, and the first otherwise", async () => {
    const { parseServerOrigins, pickServerOrigin } = await load();
    const origins = parseServerOrigins(both);
    expect(pickServerOrigin(origins, "203.0.113.7:2601")).toBe("http://203.0.113.7:2600");
    expect(pickServerOrigin(origins, "192.168.0.180:18081")).toBe("http://192.168.0.180:18080");
    expect(pickServerOrigin(origins, "studio.example:80")).toBe("http://192.168.0.180:18080");
    expect(pickServerOrigin([], "x")).toBeNull();
  });
});
